import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { sessionRoutes } from './sessions';
import { deviceRoutes } from './devices';
import { auditLogRoutes } from './auditLogs';

export function registerRoutes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: '/api/auth' });
  fastify.register(userRoutes, { prefix: '/api/users' });
  fastify.register(sessionRoutes, { prefix: '/api/sessions' });
  fastify.register(deviceRoutes, { prefix: '/api/devices' });
  fastify.register(auditLogRoutes, { prefix: '/api/audit-logs' });
}
