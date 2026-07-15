import type { FastifyReply, FastifyRequest } from 'fastify';

import { getSupabaseClient } from '../database/client';
import { getConversationService } from '../services/conversation.service';
import { getSummaryService } from '../services/summary.service';
import { logger } from '../utils/logger';

interface TwilioStatusBody {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  CallDuration?: string;
  [key: string]: any;
}

/**
 * POST /status webhook
 *
 * Triggered by Twilio when a call is completed.
 * Extracts the transcript from memory, generates an AI summary, and stores a call log.
 */
export async function twilioStatusCallbackHandler(
  request: FastifyRequest<{ Body: TwilioStatusBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { CallSid, From, CallStatus, CallDuration } = request.body || {};

  logger.info(
    { callSid: CallSid, status: CallStatus, duration: CallDuration },
    '📞 Twilio status callback received',
  );

  try {
    const conversationService = getConversationService();
    const history = await conversationService.getHistory(CallSid);

    // 1. Build text transcript
    const transcript = history
      .map((turn) => `${turn.role === 'user' ? 'Caller' : 'AI'}: ${turn.content}`)
      .join('\n');

    // 2. Query booking state to determine outcome
    const supabase = getSupabaseClient();
    let bookingOutcome = 'Inquiry';

    try {
      const { data: booking } = (await (supabase.from('bookings') as any)
        .select('status')
        .eq('call_sid', CallSid)
        .maybeSingle()) as { data: any; error: any };

      if (booking) {
        if (booking.status === 'confirmed') {
          bookingOutcome = 'Booked';
        } else if (booking.status === 'cancelled') {
          bookingOutcome = 'Cancelled';
        } else if (booking.status === 'rescheduled') {
          bookingOutcome = 'Rescheduled';
        }
      } else if (
        CallStatus === 'no-answer' ||
        CallStatus === 'busy' ||
        CallStatus === 'failed'
      ) {
        bookingOutcome = 'Missed';
      } else if (history.length === 0) {
        bookingOutcome = 'Missed';
      }
    } catch (dbErr) {
      logger.warn(dbErr, 'Failed to fetch booking details for status check, defaulting outcome to Inquiry');
    }

    // 3. Generate summary using OpenRouter
    const summaryService = getSummaryService();
    const summary = await summaryService.summarizeTranscript(transcript);

    // 4. Save call log record in Supabase
    const { error: insertErr } = (await (supabase.from('call_logs') as any).insert({
      call_sid: CallSid,
      caller_phone: From || 'Unknown',
      transcript: transcript || 'Call hung up before starting conversation.',
      summary,
      duration_seconds: parseInt(CallDuration || '0', 10),
      booking_outcome: bookingOutcome,
    })) as { error: any };

    if (insertErr) {
      logger.error({ error: insertErr, callSid: CallSid }, 'Failed to save call log to Supabase');
      void reply.status(500).send({ success: false, error: 'Database write failed' });
      return;
    }

    logger.info({ callSid: CallSid, bookingOutcome }, '📞 Call log saved successfully');
    void reply.status(200).send({ success: true });

  } catch (err: any) {
    logger.error(err, 'Unexpected error executing Twilio call status callback');
    void reply.status(500).send({
      success: false,
      error: err.message || 'An unexpected error occurred.',
    });
  }
}
export type { twilioStatusCallbackHandler as default };
