import type { FastifyInstance } from 'fastify';

import { voiceWebhookHandler } from '../api/twilioHandler';

export function twilioRoutes(
  app: FastifyInstance,
  _opts: unknown,
  done: (err?: Error) => void,
): void {
  /**
   * POST /voice
   * POST /api/v1/twilio/voice
   *
   * Webhook called by Twilio when an inbound call is received.
   */
  app.post('/voice', voiceWebhookHandler);

  done();
}
export type { twilioRoutes as default };
