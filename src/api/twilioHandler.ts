import type { FastifyReply, FastifyRequest } from 'fastify';

import { getTwilioService } from '../services/twilio.service';
import { logger } from '../utils/logger';

interface TwilioVoiceBody {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  [key: string]: any;
}

/**
 * POST /voice webhook
 *
 * Incoming call trigger from Twilio. Validates the signature (if enabled)
 * and returns the initial TwiML greeting.
 */
export async function voiceWebhookHandler(
  request: FastifyRequest<{ Body: TwilioVoiceBody }>,
  reply: FastifyReply,
): Promise<void> {
  const twilioService = getTwilioService();
  const signature = (request.headers['x-twilio-signature'] as string) || '';

  // Construct full request URL for signature validation (Twilio requires exact URL matching)
  const protocol = request.headers['x-forwarded-proto'] as string || 'http';
  const host = request.headers['host'] as string;
  const fullUrl = `${protocol}://${host}${request.url}`;

  // 1. Validate request signature
  const isValid = twilioService.validateRequest(
    signature,
    fullUrl,
    request.body || {},
  );

  if (!isValid) {
    void reply.status(401).send('Unauthorized: Twilio Signature Validation Failed');
    return;
  }

  // 2. Extract call variables and log
  const { CallSid, From, To, CallStatus, Direction } = request.body || {};
  logger.info(
    {
      callSid: CallSid,
      from: From,
      to: To,
      status: CallStatus,
      direction: Direction,
    },
    '📞 Inbound Twilio call webhook received',
  );

  // 3. Generate TwiML
  const twimlXml = twilioService.generateGreetingTwiML();

  // 4. Return TwiML response
  void reply
    .status(200)
    .header('Content-Type', 'text/xml')
    .send(twimlXml);
}
export type { voiceWebhookHandler as default };
