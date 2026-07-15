import type { FastifyInstance } from 'fastify';

import { chatHandler, chatTestHandler } from '../api/chatHandler';

/**
 * Chat routes — Gemini AI conversation endpoints.
 *
 * Routes registered under prefix /api/chat (set in app.ts).
 */
export function chatRoutes(
  app: FastifyInstance,
  _opts: unknown,
  done: (err?: Error) => void,
): void {
  /**
   * POST /api/chat
   *
   * Send a message to Gemini and receive an AI response.
   *
   * Request body:
   *   {
   *     "message": string           (required) — the user's message
   *     "history": [                (optional) — conversation history for multi-turn context
   *       { "role": "user"|"model", "content": string }
   *     ],
   *     "systemInstruction": string (optional) — override the default receptionist persona
   *     "temperature": number       (optional, 0–1, default 0.7) — response creativity
   *     "maxOutputTokens": number   (optional, default 1024) — response length cap
   *   }
   *
   * Response:
   *   {
   *     "success": true,
   *     "data": {
   *       "reply": string,
   *       "model": string,
   *       "usage": { "promptTokens", "candidateTokens", "totalTokens" },
   *       "finishReason": string
   *     },
   *     "meta": { "reqId", "timestamp" }
   *   }
   */
  app.post(
    '/',
    {
      schema: {
        description: 'Send a message to Gemini AI and receive a response',
        tags: ['Chat'],
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              minLength: 1,
              maxLength: 4096,
              description: 'The user message to send to the receptionist AI',
            },
            conversationId: {
              type: 'string',
              minLength: 1,
              maxLength: 128,
              description: 'Optional conversation session ID to persist context',
            },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  reply: { type: 'string' },
                  conversationId: { type: 'string' },
                  model: { type: 'string' },
                  usage: {
                    type: 'object',
                    properties: {
                      promptTokens: { type: 'number' },
                      candidateTokens: { type: 'number' },
                      totalTokens: { type: 'number' },
                    },
                  },
                  finishReason: { type: 'string' },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  reqId: { type: 'string' },
                  timestamp: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    chatHandler,
  );

  /**
   * GET /api/chat/test
   *
   * Sends a fixed verification prompt to Gemini to confirm the live
   * API connection is healthy. No request body required.
   *
   * Response:
   *   {
   *     "success": true,
   *     "data": {
   *       "status": "connected",
   *       "reply": string,
   *       "model": string,
   *       "usage": { ... }
   *     }
   *   }
   */
  app.get(
    '/test',
    {
      schema: {
        description: 'Verify the live Gemini API connection with a predefined test prompt',
        tags: ['Chat'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  reply: { type: 'string' },
                  model: { type: 'string' },
                  usage: { type: 'object' },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  reqId: { type: 'string' },
                  timestamp: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    chatTestHandler,
  );
  done();
}
