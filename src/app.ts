import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import fastifyFormbody from '@fastify/formbody';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { adminRoutes } from './routes/admin';
import { appointmentsRoutes } from './routes/appointments';
import { bookingsRoutes } from './routes/bookings';
import { chatRoutes } from './routes/chat';
import { healthRoutes } from './routes/health';
import { twilioConversationRoutes } from './routes/twilioConversation';
import { serveDashboardUiHandler } from './api/adminHandler';
import { logger } from './utils/logger';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // We use our own pino logger via middleware
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });

  // ── Plugins ──────────────────────────────────────────────────────────────
  await app.register(fastifySensible);
  await app.register(fastifyFormbody);

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await app.register(fastifyCors, {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  });

  await app.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });

  // ── Middleware ────────────────────────────────────────────────────────────
  app.addHook('onRequest', requestLogger);
  app.setErrorHandler(errorHandler);

  // ── Routes ────────────────────────────────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/health' });

  await app.register(chatRoutes, { prefix: '/api/chat' });
  await app.register(bookingsRoutes, { prefix: '/api/bookings' });
  await app.register(appointmentsRoutes, { prefix: '/api/appointments' });
  await app.register(twilioConversationRoutes, { prefix: '/api/v1/twilio' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  // Map /admin directly to the dashboard view
  app.get('/admin', serveDashboardUiHandler);

  // Future route registrations:
  // await app.register(calendarRoutes, { prefix: '/api/v1/calendar' });
  // await app.register(crmRoutes,      { prefix: '/api/v1/crm' });
  // await app.register(websocketRoutes,{ prefix: '/ws' });

  logger.info('App registered: plugins, middleware, routes');
  return app;
}
