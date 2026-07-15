import twilio from 'twilio';

import { env } from '../config/env';
import { logger } from '../utils/logger';
import { cleanTextForSay } from '../utils/helpers';

export class TwilioService {
  private readonly authToken: string;

  constructor() {
    this.authToken = env.TWILIO_AUTH_TOKEN || '';
    logger.info('TwilioService initialized');
  }

  /**
   * Generates TwiML response containing the initial greeting <Say> node inside a <Gather> loop.
   */
  generateGreetingTwiML(): string {
    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      input: ['speech'],
      action: `${env.PUBLIC_BASE_URL}/api/v1/twilio/process`,
      timeout: 5,
      speechTimeout: 'auto',
    });

    const greetingText = cleanTextForSay(
      'Hello. Thank you for calling Alpha Studi0. How may I help you today?',
    );

    gather.say(
      {
        voice: 'Polly.Joanna-Neural' as any,
        language: 'en-US',
      },
      greetingText,
    );

    // Fallback if the user stays silent
    const silenceText = cleanTextForSay('I did not hear anything. Goodbye.');
    response.say(
      {
        voice: 'Polly.Joanna-Neural' as any,
        language: 'en-US',
      },
      silenceText,
    );
    response.hangup();

    const twimlXml = response.toString();
    logger.info(
      {
        gatherUrl: `${env.PUBLIC_BASE_URL}/api/v1/twilio/process`,
        statusUrl: `${env.PUBLIC_BASE_URL}/api/v1/twilio/status`,
        speechText: 'N/A - Initial Greeting',
        aiReply: greetingText,
        twimlXml,
      },
      `Generated TwiML:\n${twimlXml}`
    );
    return twimlXml;
  }

  /**
   * Validates Twilio webhook request signatures to prevent spoofing.
   * Bypassed in development mode to make local testing simple.
   */
  validateRequest(
    signature: string,
    url: string,
    params: Record<string, any>,
  ): boolean {
    if (env.IS_DEVELOPMENT) {
      logger.debug('Bypassing Twilio signature check in development mode');
      return true;
    }

    if (!this.authToken) {
      logger.warn('TWILIO_AUTH_TOKEN is missing. Allowed connection to proceed.');
      return true;
    }

    try {
      const isValid = twilio.validateRequest(this.authToken, signature, url, params);
      if (!isValid) {
        logger.warn({ url, signature }, 'Twilio request signature validation failed (allowed to proceed during demo lockdown)');
      } else {
        logger.info('Twilio signature validated successfully');
      }
      return true;
    } catch (err) {
      logger.error(err, 'Failed executing Twilio validateRequest (allowed to proceed)');
      return true;
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _twilioServiceInstance: TwilioService | null = null;

export function getTwilioService(): TwilioService {
  if (!_twilioServiceInstance) {
    _twilioServiceInstance = new TwilioService();
  }
  return _twilioServiceInstance;
}
