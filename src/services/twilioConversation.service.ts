import twilio from 'twilio';

import { logger } from '../utils/logger';

export class TwilioConversationService {
  constructor() {
    logger.info('TwilioConversationService initialized');
  }

  /**
   * Generates initial greeting TwiML wrapping `<Say>` inside `<Gather>`.
   */
  generateGreetingTwiML(): string {
    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      input: ['speech'],
      action: '/api/v1/twilio/process',
      timeout: 5,
      speechTimeout: 'auto',
    });

    gather.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      'Hello. Thank you for calling Sparkle Family Dental. I am your AI receptionist. How may I help you today?',
    );

    // Fallback if the user stays silent
    response.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      "I didn't hear anything. Goodbye.",
    );
    response.hangup();

    return response.toString();
  }

  /**
   * Generates response TwiML containing the AI response and a subsequent `<Gather>` loop.
   */
  generateConversationTwiML(aiReplyText: string): string {
    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      input: ['speech'],
      action: '/api/v1/twilio/process',
      timeout: 5,
      speechTimeout: 'auto',
    });

    gather.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      aiReplyText,
    );

    // Fallback if the user stays silent
    response.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      'Thank you for calling. Goodbye.',
    );
    response.hangup();

    return response.toString();
  }

  /**
   * Generates error TwiML to gracefully recover from OpenRouter errors
   * without hanging up, letting the customer retry.
   */
  generateErrorRecoveryTwiML(): string {
    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      input: ['speech'],
      action: '/api/v1/twilio/process',
      timeout: 5,
      speechTimeout: 'auto',
    });

    gather.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      "I'm sorry, I encountered a temporary connection issue. Could you please repeat that?",
    );

    // Fallback if user stays silent
    response.say(
      {
        voice: 'Polly.Neural-Olivia' as any,
        language: 'en-US',
      },
      'Thank you for calling. Goodbye.',
    );
    response.hangup();

    return response.toString();
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
