import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Centralised Fastify error handler.
 *
 * - Logs the error with context.
 * - Returns a structured JSON error response.
 * - Hides internal stack traces in production.
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const statusCode = error.statusCode ?? 500;

  logger.error(
    {
      err: error,
      reqId: request.id,
      method: request.method,
      url: request.url,
      statusCode,
    },
    'Request error',
  );

  void reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code ?? 'INTERNAL_ERROR',
      message: statusCode < 500 ? error.message : 'An unexpected error occurred',
      ...(env.IS_DEVELOPMENT && statusCode >= 500 ? { stack: error.stack } : {}),
    },
    meta: {
      reqId: request.id,
      timestamp: new Date().toISOString(),
    },
  });
}
