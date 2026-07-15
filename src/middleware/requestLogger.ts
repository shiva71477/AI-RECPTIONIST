import type { FastifyReply, FastifyRequest } from 'fastify';

import { logger } from '../utils/logger';

/**
 * Request logger hook.
 *
 * Logs every inbound request at the start of the lifecycle.
 * Response logging (status, latency) is handled by Fastify's built-in onSend hook
 * if needed, or can be wired here.
 */
export function requestLogger(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: (err?: Error) => void,
): void {
  logger.info(
    {
      method: request.method,
      url: request.url,
      ip: request.ip,
      reqId: request.id,
    },
    'Incoming request',
  );
  done();
}
