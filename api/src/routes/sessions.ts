import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDatabase } from '../utils/database';
import { SessionModel } from '../models/session';
import { DeviceModel } from '../models/device';
import { AuditLogModel } from '../models/auditLog';
import { requireAdmin } from '../middleware/auth';
import { generateSessionToken } from '../utils/auth';

const createSessionSchema = z.object({
  user_id: z.string().uuid(),
  device_id: z.string().min(1),
  device_hostname: z.string().optional(),
  device_mac: z.string().optional(),
  device_ip: z.string().optional(),
});

const heartbeatSchema = z.object({
  device_id: z.string().min(1),
  session_token: z.string().min(1),
});

export async function sessionRoutes(fastify: FastifyInstance) {
  const db = getDatabase();
  const sessionModel = new SessionModel(db);
  const deviceModel = new DeviceModel(db);
  const auditLogModel = new AuditLogModel(db);

  // List active sessions
  fastify.get('/', {
    onRequest: [requireAdmin],
  }, async () => {
    const sessions = await sessionModel.listActive();
    return { sessions };
  });

  // Create session (issues short-lived token for PXE client)
  fastify.post('/create', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const body = createSessionSchema.parse(request.body);
    const currentUser = request.user as any;

    // Terminate any existing active sessions for this device
    await sessionModel.terminateByDeviceId(body.device_id);

    // Generate session token
    const sessionToken = generateSessionToken();

    // Create new session
    const session = await sessionModel.create({
      ...body,
      session_token: sessionToken,
    });

    // Register/update device
    await deviceModel.register({
      device_id: body.device_id,
      hostname: body.device_hostname,
      mac_address: body.device_mac,
      ip_address: body.device_ip,
    });

    await auditLogModel.create({
      user_id: currentUser.id,
      action: 'create_session',
      resource_type: 'session',
      resource_id: session.id,
      details: {
        device_id: body.device_id,
        target_user_id: body.user_id,
      },
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
    });

    return reply.status(201).send({
      session_token: sessionToken,
      expires_in: process.env.SESSION_TOKEN_EXPIRES_IN || '5m',
    });
  });

  // Client heartbeat (keeps session alive)
  fastify.post('/heartbeat', async (request, reply) => {
    const body = heartbeatSchema.parse(request.body);

    const session = await sessionModel.findByToken(body.session_token);
    if (!session || session.status !== 'active') {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Session not found or inactive',
      });
    }

    if (session.device_id !== body.device_id) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Device ID mismatch',
      });
    }

    await sessionModel.updateHeartbeat(session.id);
    await deviceModel.updateStatus(body.device_id, 'online');

    return { status: 'ok' };
  });

  // Get session by ID
  fastify.get('/:id', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await sessionModel.findById(id);

    if (!session) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Session not found',
      });
    }

    return session;
  });

  // Terminate session (kick user)
  fastify.post('/:id/terminate', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user as any;

    const session = await sessionModel.findById(id);
    if (!session) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Session not found',
      });
    }

    const terminated = await sessionModel.terminate(id);
    if (terminated) {
      await deviceModel.updateStatus(session.device_id, 'offline');

      await auditLogModel.create({
        user_id: currentUser.id,
        action: 'terminate_session',
        resource_type: 'session',
        resource_id: id,
        details: {
          device_id: session.device_id,
          target_user_id: session.user_id,
        },
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
      });
    }

    return { success: terminated };
  });

  // Cleanup stale sessions
  fastify.post('/cleanup', {
    onRequest: [requireAdmin],
  }, async () => {
    const count = await sessionModel.cleanupStale(15);
    return { cleaned: count };
  });
}
