import { logger } from '../utils/logger';

export interface MemoryChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
}

export class ConversationService {
  // Map of conversationId to messages history
  private sessions = new Map<string, MemoryChatMessage[]>();

  constructor() {
    logger.info('Memory-based ConversationService initialized');
  }

  /**
   * Retrieves conversation history for a given ID.
   * If the ID does not exist, returns an empty array.
   */
  async getHistory(conversationId: string): Promise<MemoryChatMessage[]> {
    logger.debug({ conversationId }, 'Retrieving conversation history');
    return this.sessions.get(conversationId) || [];
  }

  /**
   * Appends a message to the conversation history.
   * Creates the session history array if it doesn't exist.
   */
  async saveMessage(conversationId: string, message: MemoryChatMessage): Promise<void> {
    logger.debug({ conversationId, role: message.role }, 'Saving message to history');
    const history = this.sessions.get(conversationId) || [];
    history.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    });
    this.sessions.set(conversationId, history);
  }

  /**
   * Clears history for a given session.
   */
  async clearHistory(conversationId: string): Promise<void> {
    logger.info({ conversationId }, 'Clearing conversation history');
    this.sessions.delete(conversationId);
  }

  /**
   * Lists all active conversationIds (useful for debugging/indexing).
   */
  async getActiveSessionIds(): Promise<string[]> {
    return Array.from(this.sessions.keys());
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _conversationServiceInstance: ConversationService | null = null;

export function getConversationService(): ConversationService {
  if (!_conversationServiceInstance) {
    _conversationServiceInstance = new ConversationService();
  }
  return _conversationServiceInstance;
}
