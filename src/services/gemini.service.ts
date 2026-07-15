import OpenAI from 'openai';

import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getBookingService } from './booking.service';
import { getCalendarService } from './calendar.service';
import { PromptBuilder } from './promptBuilder';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatOptions {
  conversationId?: string;
  history?: ChatMessage[];
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  disableTools?: boolean;
}

export interface ChatResult {
  text: string;
  model: string;
  promptTokens?: number;
  candidateTokens?: number;
  totalTokens?: number;
  finishReason?: string;
}

// ── GeminiService ─────────────────────────────────────────────────────────────

export class GeminiService {
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
        'X-Title': 'AI Receptionist',
      },
    });
    this.modelName = env.GEMINI_MODEL || 'google/gemini-2.5-flash';
    logger.info({ model: this.modelName }, 'GeminiService (OpenAI SDK + OpenRouter backend) initialized');
  }

  /**
   * Send a message to Gemini (via OpenRouter) and execute tools in a loop if requested.
   *
   * @param message   - The user's message text
   * @param options   - Optional history, conversationId, systemInstruction override, generation params
   * @returns         - Structured ChatResult with final text and token usage metadata
   */
  async chat(message: string, options: ChatOptions = {}): Promise<ChatResult> {
    const {
      conversationId = 'default',
      history = [],
      systemInstruction = PromptBuilder.buildSystemInstruction(),
      maxOutputTokens = 1024,
      temperature = 0.7,
    } = options;

    logger.info(
      { model: this.modelName, historyLength: history.length, messageLength: message.length },
      'Sending message to Gemini (via OpenRouter)',
    );

    // Build the messages payload in OpenAI format
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // System prompt
    if (systemInstruction) {
      messages.push({
        role: 'system',
        content: systemInstruction,
      });
    }

    // History turns
    for (const turn of history) {
      messages.push({
        role: turn.role === 'model' ? 'assistant' : 'user',
        content: turn.content,
      });
    }

    // Current user message
    messages.push({
      role: 'user',
      content: message,
    });

    const tools: OpenAI.Chat.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'getAvailableSlots',
          description: 'Retrieves all free dental appointment slots for a specific date (YYYY-MM-DD format).',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'The date in YYYY-MM-DD format (e.g. 2026-07-21).',
              },
            },
            required: ['date'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'checkAvailability',
          description: 'Checks if a specific date and time slot is available for an appointment.',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'The date in YYYY-MM-DD format (e.g. 2026-07-21).',
              },
              time: {
                type: 'string',
                description: 'The time in HH:MM format (e.g. 10:00 or 14:30).',
              },
            },
            required: ['date', 'time'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'createAppointment',
          description: 'Creates/books a new dental appointment event after gathering customer name, phone, email (optional), requested service, date and time.',
          parameters: {
            type: 'object',
            properties: {
              customerName: {
                type: 'string',
                description: 'Full name of the customer.',
              },
              customerPhone: {
                type: 'string',
                description: 'Contact phone number of the customer.',
              },
              customerEmail: {
                type: 'string',
                description: 'Optional email address of the customer.',
              },
              requestedService: {
                type: 'string',
                description: 'The dental service requested (e.g. Routine Cleaning & Exam, Teeth Whitening).',
              },
              date: {
                type: 'string',
                description: 'Appointment date in YYYY-MM-DD format.',
              },
              time: {
                type: 'string',
                description: 'Appointment time in HH:MM format.',
              },
            },
            required: ['customerName', 'customerPhone', 'requestedService', 'date', 'time'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'cancelAppointment',
          description: 'Cancels/deletes an existing dental appointment in the calendar using the Google Calendar Event ID.',
          parameters: {
            type: 'object',
            properties: {
              eventId: {
                type: 'string',
                description: 'The Google Calendar Event ID to delete.',
              },
            },
            required: ['eventId'],
          },
        },
      },
    ];

    let loopLimit = 5;
    while (loopLimit-- > 0) {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages,
        temperature,
        max_tokens: maxOutputTokens,
        tools: options.disableTools ? undefined : tools,
      });

      const responseMessage = response.choices[0].message;
      const toolCalls = responseMessage.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        // No tool calls — return the final conversational text
        const text = responseMessage.content || '';
        const usage = response.usage;
        return {
          text,
          model: this.modelName,
          promptTokens: usage?.prompt_tokens,
          candidateTokens: usage?.completion_tokens,
          totalTokens: usage?.total_tokens,
          finishReason: response.choices[0].finish_reason || 'stop',
        };
      }

      // Add the assistant's tool-call response to messages list
      messages.push(responseMessage);

      // Execute each tool call and append responses
      for (const tc of toolCalls as any[]) {
        const functionName = tc.function.name;
        const args = JSON.parse(tc.function.arguments);
        logger.info({ functionName, args }, 'Gemini requested tool call');
        let responsePayload: any;
        const toolStartTime = performance.now();
        let success = true;

        try {
          if (functionName === 'getAvailableSlots') {
            const { date } = args as { date: string };
            const calendarService = getCalendarService();
            const slots = await calendarService.getAvailableSlots(date);
            responsePayload = { slots };
          } else if (functionName === 'checkAvailability') {
            const { date, time } = args as { date: string; time: string };
            const bookingService = getBookingService();
            const targetDate = new Date(`${date}T${time}:00`);
            if (!bookingService.isWithinBusinessHours(targetDate)) {
              responsePayload = {
                available: false,
                reason: 'Outside business hours. Business hours are: Mon-Fri 8 AM-5 PM, Sat 9 AM-2 PM, Sun Closed.',
              };
            } else {
              const checkResult = await bookingService.checkAvailability(targetDate);
              responsePayload = {
                available: checkResult.available,
              };
            }
          } else if (functionName === 'createAppointment') {
            const { customerName, customerPhone, customerEmail, requestedService, date, time } = args as any;
            const bookingService = getBookingService();
            const targetDate = new Date(`${date}T${time}:00`);
            const bookingResult = await bookingService.createBooking({
              conversationId,
              customerName,
              customerPhone,
              customerEmail,
              requestedService,
              appointmentTime: targetDate,
              callSid: conversationId.startsWith('CA') ? conversationId : undefined,
            });
            responsePayload = bookingResult;
          } else if (functionName === 'cancelAppointment') {
            const { eventId } = args as { eventId: string };
            const calendarService = getCalendarService();
            await calendarService.cancelAppointment(eventId);
            responsePayload = { success: true };
          } else {
            responsePayload = { error: `Function ${functionName} not found.` };
          }
        } catch (err: any) {
          success = false;
          logger.error({ err, functionName }, 'Tool call execution error');
          responsePayload = { error: err.message || 'Error occurred during tool call.' };
        } finally {
          if (responsePayload && responsePayload.success === false) {
            success = false;
          }
          const executionTimeMs = Math.round(performance.now() - toolStartTime);
          logger.info({
            toolName: functionName,
            arguments: args,
            executionTimeMs,
            success,
            model: this.modelName,
            conversationId,
            callSid: conversationId.startsWith('CA') ? conversationId : undefined,
          }, 'Tool execution completed');
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(responsePayload),
        });
      }
    }

    throw new Error('Too many tool call iterations (limit exceeded)');
  }

  /**
   * Verify the live connection by sending a known test prompt.
   * Used by the /api/chat/test endpoint.
   */
  async testConnection(): Promise<ChatResult> {
    const testPrompt = 'You are being tested. Reply with exactly: "AI Receptionist online. Gemini connection verified." and nothing else.';
    return this.chat(testPrompt, {
      systemInstruction: 'Follow the instruction exactly. Do not add anything.',
      temperature: 0,
      maxOutputTokens: 64,
    });
  }

  /** Expose the active model name for diagnostics */
  getModelName(): string {
    return this.modelName;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _geminiServiceInstance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!_geminiServiceInstance) {
    _geminiServiceInstance = new GeminiService();
  }
  return _geminiServiceInstance;
}
