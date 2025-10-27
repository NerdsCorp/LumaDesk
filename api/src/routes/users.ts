import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDatabase } from '../utils/database';
import { UserModel } from '../models/user';
import { AuditLogModel } from '../models/auditLog';
import { requireAdmin } from '../middleware/auth';

const createUserSchema = z.object({
  username: z.string().min(3).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'user']).optional(),
  allowed_devices: z.array(z.string()).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'user']).optional(),
  allowed_devices: z.array(z.string()).optional(),
});

const bulkImportSchema = z.object({
  users: z.array(z.object({
    username: z.string().min(3).max(255),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'user']).optional(),
  })),
});

export async function userRoutes(fastify: FastifyInstance) {
  const db = getDatabase();
  const userModel = new UserModel(db);
  const auditLogModel = new AuditLogModel(db);

  // List all users
  fastify.get('/', {
    onRequest: [requireAdmin],
  }, async () => {
    const users = await userModel.list();
    return { users };
  });

  // Get user by ID
  fastify.get('/:id', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await userModel.findById(id);

    if (!user) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { password_hash, ...userData } = user;
    return userData;
  });

  // Create user
  fastify.post('/', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const currentUser = request.user as any;

    // Check if username or email already exists
    const existingUser = await userModel.findByUsername(body.username);
    if (existingUser) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Username already exists',
      });
    }

    const existingEmail = await userModel.findByEmail(body.email);
    if (existingEmail) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Email already exists',
      });
    }

    const user = await userModel.create(body);

    await auditLogModel.create({
      user_id: currentUser.id,
      action: 'create_user',
      resource_type: 'user',
      resource_id: user.id,
      details: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
    });

    return reply.status(201).send(user);
  });

  // Update user
  fastify.patch('/:id', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateUserSchema.parse(request.body);
    const currentUser = request.user as any;

    const user = await userModel.update(id, body);
    if (!user) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    await auditLogModel.create({
      user_id: currentUser.id,
      action: 'update_user',
      resource_type: 'user',
      resource_id: id,
      details: body,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
    });

    return user;
  });

  // Delete user
  fastify.delete('/:id', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user as any;

    // Prevent deleting yourself
    if (id === currentUser.id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Cannot delete your own account',
      });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    await userModel.delete(id);

    await auditLogModel.create({
      user_id: currentUser.id,
      action: 'delete_user',
      resource_type: 'user',
      resource_id: id,
      details: {
        username: user.username,
        email: user.email,
      },
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
    });

    return { success: true };
  });

  // Bulk import users from CSV
  fastify.post('/bulk-import', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const body = bulkImportSchema.parse(request.body);
    const currentUser = request.user as any;

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ username: string; error: string }>,
    };

    for (const userData of body.users) {
      try {
        // Check if user already exists
        const existingUser = await userModel.findByUsername(userData.username);
        if (existingUser) {
          results.failed++;
          results.errors.push({
            username: userData.username,
            error: 'Username already exists',
          });
          continue;
        }

        const user = await userModel.create(userData);
        results.success++;

        await auditLogModel.create({
          user_id: currentUser.id,
          action: 'bulk_import_user',
          resource_type: 'user',
          resource_id: user.id,
          details: {
            username: user.username,
            email: user.email,
          },
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
        });
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          username: userData.username,
          error: err.message || 'Unknown error',
        });
      }
    }

    return results;
  });
}
