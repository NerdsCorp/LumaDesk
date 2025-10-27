import { FastifyInstance } from 'fastify';
import { getDatabase } from '../utils/database';
import { AuditLogModel } from '../models/auditLog';
import { requireAdmin } from '../middleware/auth';

export async function auditLogRoutes(fastify: FastifyInstance) {
  const db = getDatabase();
  const auditLogModel = new AuditLogModel(db);

  // List audit logs
  fastify.get('/', {
    onRequest: [requireAdmin],
  }, async (request) => {
    const { limit = 100, offset = 0 } = request.query as {
      limit?: number;
      offset?: number;
    };

    const logs = await auditLogModel.list(Number(limit), Number(offset));
    return { logs };
  });

  // List audit logs by user
  fastify.get('/user/:userId', {
    onRequest: [requireAdmin],
  }, async (request) => {
    const { userId } = request.params as { userId: string };
    const { limit = 100 } = request.query as { limit?: number };

    const logs = await auditLogModel.listByUserId(userId, Number(limit));
    return { logs };
  });

  // List audit logs by resource type
  fastify.get('/resource/:resourceType', {
    onRequest: [requireAdmin],
  }, async (request) => {
    const { resourceType } = request.params as { resourceType: string };
    const { limit = 100 } = request.query as { limit?: number };

    const logs = await auditLogModel.listByResourceType(resourceType, Number(limit));
    return { logs };
  });
}
