import type { FastifyReply, FastifyRequest } from 'fastify';

import { getConversationService } from '../services/conversation.service';
import { getGeminiService } from '../services/gemini.service';
import { getTwilioService } from '../services/twilio.service';
import { getTwilioConversationService } from '../services/twilioConversation.service';
import { logger } from '../utils/logger';

interface TwilioVoiceBody {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  SpeechResult?: string;
  [key: string]: any;
}

/**
 * POST /voice webhook
 * Plays the initial greeting and launches the `<Gather>` voice loops.
 */
export async function voiceGreetingHandler(
  request: FastifyRequest<{ Body: TwilioVoiceBody }>,
  reply: FastifyReply,
): Promise<void> {
  const twilioService = getTwilioService();
  const twilioConvService = getTwilioConversationService();
  const signature = (request.headers['x-twilio-signature'] as string) || '';

  const protocol = (request.headers['x-forwarded-proto'] as string) || 'http';
  const host = request.headers['host'] as string;
  const fullUrl = `${protocol}://${host}${request.url}`;

  // 1. Verify Twilio request signature
  const isValid = twilioService.validateRequest(signature, fullUrl, request.body || {});
  if (!isValid) {
    void reply.status(401).send('Unauthorized: Twilio Signature Verification Failed');
    return;
  }

  // 2. Extract call details and log
  const { CallSid, From, To, CallStatus, Direction } = request.body || {};
  logger.info(
    {
      callSid: CallSid,
      from: From,
      to: To,
      status: CallStatus,
      direction: Direction,
    },
    '📞 Inbound Twilio voice connection established',
  );

  // 3. Return greeting TwiML
  const actionUrl = `${protocol}://${host}/api/v1/twilio/process`;
  const twiml = twilioConvService.generateGreetingTwiML(actionUrl);
  void reply
    .status(200)
    .header('Content-Type', 'text/xml')
    .send(twiml);
}

/**
 * POST /process webhook
 * Receives the caller transcript, queries Gemini AI (via OpenRouter), and loops `<Gather>`.
 */
export async function processSpeechHandler(
  request: FastifyRequest<{ Body: TwilioVoiceBody }>,
  reply: FastifyReply,
): Promise<void> {
  const startTime = Date.now();
  const twilioService = getTwilioService();
  const twilioConvService = getTwilioConversationService();
  const geminiService = getGeminiService();

  const signature = (request.headers['x-twilio-signature'] as string) || '';
  const protocol = (request.headers['x-forwarded-proto'] as string) || 'http';
  const host = request.headers['host'] as string;
  const fullUrl = `${protocol}://${host}${request.url}`;

  // 1. Verify Twilio request signature
  const isValid = twilioService.validateRequest(signature, fullUrl, request.body || {});
  if (!isValid) {
    void reply.status(401).send('Unauthorized: Twilio Signature Verification Failed');
    return;
  }

  const { CallSid, From, SpeechResult } = request.body || {};

  // 2. Handle empty speech transcripts gracefully
  if (!SpeechResult || !SpeechResult.trim()) {
    logger.info({ callSid: CallSid, from: From }, 'Empty SpeechResult received from Twilio');
    const twiml = twilioConvService.generateErrorRecoveryTwiML();
    void reply
      .status(200)
      .header('Content-Type', 'text/xml')
      .send(twiml);
    return;
  }

  logger.info(
    { callSid: CallSid, from: From, userTranscript: SpeechResult },
    'Processing caller voice query',
  );

  try {
    const conversationService = getConversationService();
    const history = await conversationService.getHistory(CallSid);
    const chatHistory = history.map((h) => ({
      role: h.role,
      content: h.content,
    }));

    // 3. Query Gemini AI with memory persistence mapped to CallSid
    const aiResult = await geminiService.chat(SpeechResult, {
      conversationId: CallSid,
      history: chatHistory,
      disableTools: false,
    });

    // 4. Save new turns in memory
    await conversationService.saveMessage(CallSid, {
      role: 'user',
      content: SpeechResult,
    });
    await conversationService.saveMessage(CallSid, {
      role: 'model',
      content: aiResult.text,
    });

    const latencyMs = Date.now() - startTime;

    // 4. Log interaction metadata
    logger.info(
      {
        callSid: CallSid,
        from: From,
        userTranscript: SpeechResult,
        aiResponse: aiResult.text,
        latencyMs,
        model: aiResult.model,
      },
      '📞 Twilio voice speech turn processed',
    );

    // 5. Generate loop conversation TwiML
    const actionUrl = `${protocol}://${host}/api/v1/twilio/process`;
    const twiml = twilioConvService.generateConversationTwiML(aiResult.text, actionUrl);
    void reply
      .status(200)
      .header('Content-Type', 'text/xml')
      .send(twiml);

  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    logger.error(
      {
        err,
        callSid: CallSid,
        from: From,
        userTranscript: SpeechResult,
        latencyMs,
      },
      'Error processing Twilio voice conversation turn',
    );

    // 6. Return graceful error recovery TwiML to allow retries
    const actionUrl = `${protocol}://${host}/api/v1/twilio/process`;
    const errorTwiml = twilioConvService.generateErrorRecoveryTwiML(actionUrl);
    void reply
      .status(200)
      .header('Content-Type', 'text/xml')
      .send(errorTwiml);
  }
}
