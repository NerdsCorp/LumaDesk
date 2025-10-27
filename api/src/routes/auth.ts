import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDatabase } from '../utils/database';
import { UserModel } from '../models/user';
import { AuditLogModel } from '../models/auditLog';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  const db = getDatabase();
  const userModel = new UserModel(db);
  const auditLogModel = new AuditLogModel(db);

  // Login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await userModel.verifyPassword(body.username, body.password);
    if (!user) {
      await auditLogModel.create({
        action: 'login_failed',
        resource_type: 'auth',
        details: { username: body.username },
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
      });

      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid username or password',
      });
    }

    // Create JWT tokens
    const accessToken = fastify.jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const refreshToken = fastify.signRefresh({
      id: user.id,
      username: user.username,
    });

    await auditLogModel.create({
      user_id: user.id,
      action: 'login',
      resource_type: 'auth',
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  });

  // Refresh token
  fastify.post('/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);

    try {
      const payload = fastify.verifyRefresh(body.refreshToken);

      const user = await userModel.findById(payload.id);
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not found',
        });
      }

      const accessToken = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        role: user.role,
      });

      return { accessToken };
    } catch (err) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid refresh token',
      });
    }
  });

  // Get current user
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
  }, async (request) => {
    const user = request.user as any;
    const userData = await userModel.findById(user.id);

    if (!userData) {
      throw fastify.httpErrors.notFound('User not found');
    }

    return {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      allowed_devices: userData.allowed_devices,
    };
  });
}
