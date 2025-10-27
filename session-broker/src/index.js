const Fastify = require('fastify');
const redis = require('redis');
const axios = require('axios');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const fastify = Fastify({ logger });

// Redis client for session state
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
});

// Desktop server pool configuration
const desktopServers = (process.env.DESKTOP_SERVERS || 'desktop-1:177,desktop-2:177').split(',').map(server => {
  const [host, port] = server.split(':');
  return { host, port: parseInt(port), capacity: parseInt(process.env.SERVER_CAPACITY || '50') };
});

// Server health and load tracking
const serverMetrics = new Map();

// Initialize server metrics
desktopServers.forEach(server => {
  serverMetrics.set(server.host, {
    activeSessions: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    lastHealthCheck: null,
    healthy: true,
  });
});

// Connect to Redis
redisClient.connect().then(() => {
  logger.info('Connected to Redis');
}).catch(err => {
  logger.error({ err }, 'Failed to connect to Redis');
  process.exit(1);
});

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Get server assignment for user
fastify.post('/assign', async (request, reply) => {
  const { userId, deviceId, preferredDesktop } = request.body;

  if (!userId) {
    return reply.status(400).send({ error: 'userId required' });
  }

  // Check if user has existing session (sticky session)
  const existingAssignment = await redisClient.get(`session:${userId}`);
  if (existingAssignment) {
    const assignment = JSON.parse(existingAssignment);
    logger.info({ userId, server: assignment.server }, 'Returning existing session assignment');
    return assignment;
  }

  // Find least-loaded healthy server
  const server = await selectServer(preferredDesktop);
  if (!server) {
    return reply.status(503).send({ error: 'No available desktop servers' });
  }

  // Create assignment
  const assignment = {
    server: server.host,
    port: server.port,
    protocol: 'xdmcp', // or 'rdp' for Wayland
    desktop: preferredDesktop || 'xfce',
    assignedAt: new Date().toISOString(),
  };

  // Store assignment in Redis (TTL: 12 hours)
  await redisClient.setEx(`session:${userId}`, 43200, JSON.stringify(assignment));

  // Increment active sessions
  const metrics = serverMetrics.get(server.host);
  metrics.activeSessions++;
  serverMetrics.set(server.host, metrics);

  logger.info({ userId, server: server.host }, 'Assigned user to server');

  return assignment;
});

// Release session
fastify.post('/release', async (request, reply) => {
  const { userId } = request.body;

  if (!userId) {
    return reply.status(400).send({ error: 'userId required' });
  }

  const existingAssignment = await redisClient.get(`session:${userId}`);
  if (existingAssignment) {
    const assignment = JSON.parse(existingAssignment);
    await redisClient.del(`session:${userId}`);

    // Decrement active sessions
    const metrics = serverMetrics.get(assignment.server);
    if (metrics) {
      metrics.activeSessions = Math.max(0, metrics.activeSessions - 1);
      serverMetrics.set(assignment.server, metrics);
    }

    logger.info({ userId, server: assignment.server }, 'Released session');
  }

  return { success: true };
});

// Get server metrics
fastify.get('/metrics', async () => {
  const metrics = {};
  serverMetrics.forEach((value, key) => {
    metrics[key] = value;
  });
  return metrics;
});

// Get all active sessions
fastify.get('/sessions', async () => {
  const keys = await redisClient.keys('session:*');
  const sessions = [];

  for (const key of keys) {
    const data = await redisClient.get(key);
    if (data) {
      const userId = key.replace('session:', '');
      sessions.push({
        userId,
        ...JSON.parse(data),
      });
    }
  }

  return { sessions, count: sessions.length };
});

// Select least-loaded server
async function selectServer(preferredDesktop) {
  let bestServer = null;
  let lowestLoad = Infinity;

  for (const server of desktopServers) {
    const metrics = serverMetrics.get(server.host);

    // Skip unhealthy servers
    if (!metrics.healthy) {
      continue;
    }

    // Skip servers at capacity
    if (metrics.activeSessions >= server.capacity) {
      continue;
    }

    // Calculate load score (lower is better)
    const loadScore = metrics.activeSessions / server.capacity;

    if (loadScore < lowestLoad) {
      lowestLoad = loadScore;
      bestServer = server;
    }
  }

  return bestServer;
}

// Health check for desktop servers
async function healthCheckServers() {
  for (const server of desktopServers) {
    try {
      // Simple TCP check or HTTP endpoint
      const response = await axios.get(`http://${server.host}:6000/health`, {
        timeout: 5000,
      });

      const metrics = serverMetrics.get(server.host);
      metrics.healthy = response.status === 200;
      metrics.lastHealthCheck = new Date();

      // Update metrics from server response if available
      if (response.data.metrics) {
        metrics.cpuUsage = response.data.metrics.cpu || 0;
        metrics.memoryUsage = response.data.metrics.memory || 0;
      }

      serverMetrics.set(server.host, metrics);
    } catch (err) {
      logger.warn({ server: server.host, err: err.message }, 'Desktop server health check failed');
      const metrics = serverMetrics.get(server.host);
      metrics.healthy = false;
      metrics.lastHealthCheck = new Date();
      serverMetrics.set(server.host, metrics);
    }
  }
}

// Periodic health checks (every 30 seconds)
setInterval(healthCheckServers, 30000);

// Initial health check
healthCheckServers();

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.BROKER_PORT || '3001');
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info(`Session broker listening on port ${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
