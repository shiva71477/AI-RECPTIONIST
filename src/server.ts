import 'dotenv/config';

import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  const app = await createApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(
      { port: env.PORT, host: env.HOST, env: env.NODE_ENV },
      '🚀 AI Receptionist server started',
    );
  } catch (err) {
    logger.error(err, 'Fatal error during server startup');
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => {
  logger.error(err, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

void bootstrap();
