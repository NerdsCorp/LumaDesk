import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error({
    err: error,
    req: {
      method: request.method,
      url: request.url,
      headers: request.headers,
    },
  });

  // Handle validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  // Handle JWT errors
  if (error.message.includes('Authorization token')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token',
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : error.message;

  reply.status(statusCode).send({
    error: error.name || 'Error',
    message: message,
  });
}
