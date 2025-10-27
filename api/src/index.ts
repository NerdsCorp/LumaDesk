import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { initDatabase } from './utils/database';
import { logger } from './utils/logger';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';

const fastify = Fastify({
  logger: logger,
  trustProxy: true,
});

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: (process.env.CORS_ORIGINS || 'http://localhost:8080').split(','),
      credentials: true,
    });

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'change-this-secret',
      sign: {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      },
    });

    await fastify.register(jwt, {
      secret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
      namespace: 'refresh',
      jwtSign: 'signRefresh',
      jwtVerify: 'verifyRefresh',
      sign: {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },
    });

    await fastify.register(rateLimit, {
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    });

    // Initialize database
    await initDatabase();

    // Register routes
    registerRoutes(fastify);

    // Error handler
    fastify.setErrorHandler(errorHandler);

    // Health check endpoint
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Start server
    const port = parseInt(process.env.API_PORT || '3000');
    const host = process.env.API_HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    logger.info(`LumaDesk API server running on ${host}:${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

start();
