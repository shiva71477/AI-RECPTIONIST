import type { FastifyInstance } from 'fastify';

import { processSpeechHandler, voiceGreetingHandler } from '../api/twilioConversationHandler';
import { twilioStatusCallbackHandler } from '../api/twilioStatusHandler';

export function twilioConversationRoutes(
  app: FastifyInstance,
  _opts: unknown,
  done: (err?: Error) => void,
): void {
  /**
   * POST /voice
   * POST /api/v1/twilio/voice
   * Called when an inbound call is received by Twilio.
   */
  app.post('/voice', voiceGreetingHandler);

  /**
   * POST /process
   * POST /api/v1/twilio/process
   * Called by Twilio when speech transcription is completed.
   */
  app.post('/process', processSpeechHandler);

  /**
   * POST /status
   * POST /api/v1/twilio/status
   * Status callback endpoint triggered when the Twilio call completes.
   */
  app.post('/status', twilioStatusCallbackHandler);

  done();
}
export type { twilioConversationRoutes as default };
