import OpenAI from 'openai';

import { env } from '../config/env';
import { logger } from '../utils/logger';

export class SummaryService {
  private readonly openai: OpenAI;
  private readonly modelName: string;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set. Please add the OpenRouter API Key to your .env file.');
    }
    this.openai = new OpenAI({
      apiKey: env.GEMINI_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/google/antigravity',
        'X-Title': 'AI Receptionist Summarizer',
      },
    });
    this.modelName = env.GEMINI_MODEL || 'google/gemini-2.5-flash';
    logger.info({ model: this.modelName }, 'SummaryService (OpenRouter backend) initialized');
  }

  /**
   * Summarizes a call transcript into 1-2 professional sentences outlining requests and outcomes.
   */
  async summarizeTranscript(transcript: string): Promise<string> {
    if (!transcript || !transcript.trim()) {
      return 'No conversation occurred.';
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content:
              'You are a professional receptionist coordinator. Summarize the following call transcript in 1 or 2 concise sentences, outlining what the caller wanted and the final outcome (e.g. booked, queried price, cancelled). Keep it short and objective. Avoid saying "The transcript details..." or "In this call...".',
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0.3,
        max_tokens: 128,
      });

      const summary = response.choices[0]?.message?.content?.trim() || '';
      return summary;
    } catch (err) {
      logger.error(err, 'Failed to generate transcript summary from OpenRouter');
      return 'Failed to generate summary due to connection timeout.';
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _summaryServiceInstance: SummaryService | null = null;

export function getSummaryService(): SummaryService {
  if (!_summaryServiceInstance) {
    _summaryServiceInstance = new SummaryService();
  }
  return _summaryServiceInstance;
}
