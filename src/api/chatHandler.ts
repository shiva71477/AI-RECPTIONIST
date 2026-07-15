import { randomUUID } from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { getConversationService } from '../services/conversation.service';
import { getGeminiService } from '../services/gemini.service';
import { logger } from '../utils/logger';

// ── Request / Response shapes ─────────────────────────────────────────────────

interface ChatBody {
  message: string;
  conversationId?: string;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/chat
 *
 * Accepts a user message and an optional conversationId, retrieves conversation context,
 * invokes the AI Receptionist brain, persists the new messages, and returns the response.
 */
export async function chatHandler(
  request: FastifyRequest<{ Body: ChatBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { message, conversationId: reqConversationId } = request.body;
  const conversationId = reqConversationId || randomUUID();

  logger.info({ reqId: request.id, conversationId }, 'Chat request received');

  const conversationService = getConversationService();
  const geminiService = getGeminiService();

  // 1. Retrieve prior conversation history
  const history = await conversationService.getHistory(conversationId);

  // 2. Measure latency of the LLM request
  const startTime = performance.now();
  let result;
  try {
    // Map the conversation history to the format expected by GeminiService
    const chatHistory = history.map((h) => ({
      role: h.role,
      content: h.content,
    }));

    result = await geminiService.chat(message, {
      history: chatHistory,
    });
  } catch (err) {
    logger.error({ err, reqId: request.id, conversationId }, 'Failed in GeminiService call');
    throw err;
  }
  const latencyMs = Math.round(performance.now() - startTime);

  // 3. Save new turns in memory
  await conversationService.saveMessage(conversationId, {
    role: 'user',
    content: message,
  });

  await conversationService.saveMessage(conversationId, {
    role: 'model',
    content: result.text,
  });

  // 4. Log interaction metadata
  logger.info(
    {
      conversationId,
      latencyMs,
      model: result.model,
      tokenUsage: {
        promptTokens: result.promptTokens,
        candidateTokens: result.candidateTokens,
        totalTokens: result.totalTokens,
      },
    },
    'AI Receptionist turn processed',
  );

  // 5. Send reply
  void reply.status(200).send({
    success: true,
    data: {
      reply: result.text,
      conversationId,
      model: result.model,
      usage: {
        promptTokens: result.promptTokens,
        candidateTokens: result.candidateTokens,
        totalTokens: result.totalTokens,
      },
      finishReason: result.finishReason,
    },
    meta: {
      reqId: request.id,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * GET /api/chat/test
 *
 * Sends a predefined verification prompt to Gemini to confirm the live
 * API connection is working. No request body needed.
 */
export async function chatTestHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info({ reqId: request.id }, 'Gemini connection test requested');

  const gemini = getGeminiService();
  const startTime = performance.now();
  const result = await gemini.testConnection();
  const latencyMs = Math.round(performance.now() - startTime);

  logger.info(
    {
      latencyMs,
      model: result.model,
      tokenUsage: {
        promptTokens: result.promptTokens,
        candidateTokens: result.candidateTokens,
        totalTokens: result.totalTokens,
      },
    },
    'Gemini connection test completed',
  );

  void reply.status(200).send({
    success: true,
    data: {
      status: 'connected',
      reply: result.text,
      model: result.model,
      usage: {
        promptTokens: result.promptTokens,
        candidateTokens: result.candidateTokens,
        totalTokens: result.totalTokens,
      },
    },
    meta: {
      reqId: request.id,
      timestamp: new Date().toISOString(),
    },
  });
}
