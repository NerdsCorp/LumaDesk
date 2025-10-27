import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token',
    });
  }
}

export function requireRole(role: 'admin' | 'user') {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    const user = request.user as any;
    if (user.role !== role && user.role !== 'admin') {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }
  };
}

export async function requireAdmin(
  request: AuthenticatedRequest,
  reply: FastifyReply
) {
  await authenticate(request, reply);

  const user = request.user as any;
  if (user.role !== 'admin') {
    reply.status(403).send({
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }
}
