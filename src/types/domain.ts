/**
 * Shared domain types for the AI Receptionist application.
 *
 * These interfaces will be extended as integrations are implemented.
 */

// ── Call Session ──────────────────────────────────────────────────────────────

export type CallStatus =
  | 'initiated'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'busy'
  | 'no-answer';

export interface CallSession {
  callSid: string;
  from: string;
  to: string;
  status: CallStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  transcript?: TranscriptEntry[];
}

// ── Transcript ────────────────────────────────────────────────────────────────

export type Speaker = 'caller' | 'ai';

export interface TranscriptEntry {
  speaker: Speaker;
  text: string;
  timestamp: string;
  confidenceScore?: number;
}

// ── Appointment ───────────────────────────────────────────────────────────────

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  calendarEventId: string;
  contactId: string;
  title: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes?: string;
}

// ── Contact / CRM ─────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// ── AI Conversation ───────────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'model';

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  timestamp: string;
}

export interface ConversationContext {
  sessionId: string;
  callSid?: string;
  contact?: Partial<Contact>;
  messages: ConversationMessage[];
  intent?: string;
  createdAt: string;
}
