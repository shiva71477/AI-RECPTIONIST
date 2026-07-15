import type { FastifyReply, FastifyRequest } from 'fastify';

import { getSupabaseClient } from '../database/client';
import { getBookingService } from '../services/booking.service';
import { logger } from '../utils/logger';

/**
 * GET /appointments
 *
 * Query Supabase for all upcoming bookings (appointment_time >= now),
 * sorted ascending by date and time.
 */
export async function listUpcomingAppointmentsHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info('Listing upcoming dental appointments');

  try {
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (initErr) {
      const bookingService = getBookingService();
      const mockList = bookingService.getMockBookings();
      logger.warn({ count: mockList.length }, 'Supabase is not configured yet. Returning local mock list.');
      void reply.status(200).send({
        success: true,
        data: mockList,
        meta: {
          warning: 'Supabase integration is not configured. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file.',
        },
      });
      return;
    }
    const nowIso = new Date().toISOString();

    const { data, error } = (await (supabase.from('bookings') as any)
      .select('*')
      .gte('appointment_time', nowIso)
      .order('appointment_time', { ascending: true })) as { data: any[] | null; error: any };

    if (error) {
      logger.error({ error }, 'Failed to fetch bookings from Supabase');
      void reply.status(500).send({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch upcoming appointments.',
        },
      });
      return;
    }

    void reply.status(200).send({
      success: true,
      data: data || [],
    });
  } catch (err: any) {
    logger.error(err, 'Unexpected error querying appointments list');
    void reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred.',
      },
    });
  }
}
export type { listUpcomingAppointmentsHandler as default };
