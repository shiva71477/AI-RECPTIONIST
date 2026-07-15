import type { FastifyReply, FastifyRequest } from 'fastify';

import { getSupabaseClient } from '../database/client';
import { getBookingService } from '../services/booking.service';
import { logger } from '../utils/logger';

interface CreateBookingBody {
  conversationId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  requestedService: string;
  appointmentTime: string; // ISO String
}

interface RescheduleBookingBody {
  appointmentTime: string; // ISO String
}

interface BookingParams {
  id: string;
}

export async function createBookingHandler(
  request: FastifyRequest<{ Body: CreateBookingBody }>,
  reply: FastifyReply,
): Promise<void> {
  const {
    conversationId,
    customerName,
    customerPhone,
    customerEmail,
    requestedService,
    appointmentTime,
  } = request.body;

  logger.info({ customerName, appointmentTime }, 'API request to create booking');
  const bookingService = getBookingService();

  const result = await bookingService.createBooking({
    conversationId,
    customerName,
    customerPhone,
    customerEmail,
    requestedService,
    appointmentTime: new Date(appointmentTime),
  });

  if (!result.success) {
    if (result.reason === 'occupied') {
      void reply.status(409).send({
        success: false,
        error: {
          code: 'SLOT_OCCUPIED',
          message: 'Requested appointment slot is already occupied.',
          details: { nextAvailableSlots: result.nextAvailableSlots },
        },
      });
      return;
    }

    void reply.status(500).send({
      success: false,
      error: {
        code: 'BOOKING_FAILED',
        message: 'Failed to create booking event.',
      },
    });
    return;
  }

  void reply.status(201).send({
    success: true,
    data: result,
  });
}

export async function getBookingHandler(
  request: FastifyRequest<{ Params: BookingParams }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  logger.info({ bookingId: id }, 'API request to retrieve booking');

  const supabase = getSupabaseClient();
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !booking) {
    void reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Booking not found.',
      },
    });
    return;
  }

  void reply.status(200).send({
    success: true,
    data: booking,
  });
}

export async function rescheduleBookingHandler(
  request: FastifyRequest<{ Params: BookingParams; Body: RescheduleBookingBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  const { appointmentTime } = request.body;
  logger.info({ bookingId: id, newTime: appointmentTime }, 'API request to reschedule booking');

  const bookingService = getBookingService();
  const success = await bookingService.rescheduleBooking(id, new Date(appointmentTime));

  if (!success) {
    void reply.status(400).send({
      success: false,
      error: {
        code: 'RESCHEDULE_FAILED',
        message: 'Failed to reschedule booking. Verify slot availability.',
      },
    });
    return;
  }

  void reply.status(200).send({
    success: true,
    data: {
      bookingId: id,
      status: 'rescheduled',
      appointmentTime,
    },
  });
}

export async function cancelBookingHandler(
  request: FastifyRequest<{ Params: BookingParams }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  logger.info({ bookingId: id }, 'API request to cancel booking');

  const bookingService = getBookingService();
  const success = await bookingService.cancelBooking(id);

  if (!success) {
    void reply.status(500).send({
      success: false,
      error: {
        code: 'CANCEL_FAILED',
        message: 'Failed to cancel booking.',
      },
    });
    return;
  }

  void reply.status(200).send({
    success: true,
    data: {
      bookingId: id,
      status: 'cancelled',
    },
  });
}
