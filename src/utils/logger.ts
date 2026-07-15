import pino from 'pino';

import { env } from '../config/env';

/**
 * Singleton pino logger for the application.
 *
 * - In development: pretty-prints with colours via pino-pretty.
 * - In production: outputs structured JSON (Railway/Cloud log ingestion ready).
 */
export const logger = pino({
  name: 'ai-receptionist',
  level: env.LOG_LEVEL,
  ...(env.IS_DEVELOPMENT
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
