import type { FastifyInstance } from 'fastify';

import { env } from '../config/env';
import { utcNow } from '../utils/helpers';

/**
 * Health check routes.
 *
 * GET /health        — liveness probe (is the server running?)
 * GET /health/ready  — readiness probe (is it ready to serve traffic?)
 */
export function healthRoutes(
  app: FastifyInstance,
  _opts: unknown,
  done: (err?: Error) => void,
): void {
  /**
   * Liveness probe.
   * Returns 200 as long as the process is alive.
   * Railway / Kubernetes uses this to decide whether to restart the container.
   */
  app.get(
    '/',
    {
      schema: {
        description: 'Liveness probe',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              environment: { type: 'string' },
              version: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.status(200).send({
        status: 'ok',
        timestamp: utcNow(),
        uptime: Math.floor(process.uptime()),
        environment: env.NODE_ENV,
        version: process.env['npm_package_version'] ?? '1.0.0',
      });
    },
  );

  /**
   * Readiness probe.
   * Returns 200 when all critical dependencies are reachable.
   * Returns 503 if any required service is unavailable.
   *
   * Currently performs basic config checks.
   * Add live connection pings (Supabase, Redis, etc.) as integrations are added.
   */
  app.get(
    '/ready',
    {
      schema: {
        description: 'Readiness probe',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              checks: { type: 'object' },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              checks: { type: 'object' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const checks: Record<string, 'ok' | 'not_configured' | 'error'> = {
        server: 'ok',
        // These will be replaced with real pings once integrations are wired:
        supabase: env.SUPABASE_URL ? 'ok' : 'not_configured',
        redis: env.REDIS_URL ? 'ok' : 'not_configured',
        gemini: env.GEMINI_API_KEY ? 'ok' : 'not_configured',
        twilio: env.TWILIO_ACCOUNT_SID ? 'ok' : 'not_configured',
      };

      const hasError = Object.values(checks).some((v) => v === 'error');

      return reply.status(hasError ? 503 : 200).send({
        status: hasError ? 'degraded' : 'ready',
        timestamp: utcNow(),
        checks,
      });
    },
  );
  done();
}
