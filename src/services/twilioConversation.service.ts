import twilio from 'twilio';

import { logger } from '../utils/logger';
import { cleanTextForSay } from '../utils/helpers';

export class TwilioConversationService {
  constructor() {
    logger.info('TwilioConversationService initialized');
  }

  /**
   * Generates initial greeting TwiML wrapping `<Say>` inside `<Gather>`.
   */
  generateGreetingTwiML(actionUrl?: string): string {
    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      input: ['speech'],
      action: actionUrl || '/api/v1/twilio/process',
      timeout: 5,
      speechTimeout: 'auto',
    });

    const greetingText = cleanTextForSay(
      'Hello. Thank you for calling Sparkle Family Dental. I am your AI receptionist. How may I help you today?',
    );

    gather.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      greetingText,
    );

    // Fallback if the user stays silent
    const silenceText = cleanTextForSay("I didn't hear anything. Goodbye.");
    response.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      silenceText,
    );
    response.hangup();

    const twimlXml = response.toString();
    logger.info({ twimlXml }, 'Generated Initial Voice Greeting TwiML XML');
    return twimlXml;
  }

  /**
   * Generates response TwiML containing the AI response and a subsequent `<Gather>` loop.
   */
  generateConversationTwiML(aiReplyText: string, actionUrl?: string): string {
    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      input: ['speech'],
      action: actionUrl || '/api/v1/twilio/process',
      timeout: 5,
      speechTimeout: 'auto',
    });

    const cleanAiReply = cleanTextForSay(aiReplyText);

    gather.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      cleanAiReply,
    );

    // Fallback if the user stays silent
    const silenceText = cleanTextForSay('Thank you for calling. Goodbye.');
    response.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      silenceText,
    );
    response.hangup();

    const twimlXml = response.toString();
    logger.info({ twimlXml, originalAiText: aiReplyText }, 'Generated Conversation Loop TwiML XML');
    return twimlXml;
  }

  /**
   * Generates error TwiML to gracefully recover from OpenRouter errors
   * without hanging up, letting the customer retry.
   */
  generateErrorRecoveryTwiML(actionUrl?: string): string {
    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      input: ['speech'],
      action: actionUrl || '/api/v1/twilio/process',
      timeout: 5,
      speechTimeout: 'auto',
    });

    const errorRecoveryText = cleanTextForSay(
      "I'm sorry, I encountered a temporary connection issue. Could you please repeat that?",
    );

    gather.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      errorRecoveryText,
    );

    // Fallback if user stays silent
    const silenceText = cleanTextForSay('Thank you for calling. Goodbye.');
    response.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      silenceText,
    );
    response.hangup();

    const twimlXml = response.toString();
    logger.info({ twimlXml }, 'Generated Error Recovery TwiML XML');
    return twimlXml;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _twilioConversationServiceInstance: TwilioConversationService | null = null;

export function getTwilioConversationService(): TwilioConversationService {
  if (!_twilioConversationServiceInstance) {
    _twilioConversationServiceInstance = new TwilioConversationService();
  }
  return _twilioConversationServiceInstance;
}
