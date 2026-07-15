import profileData from '../config/company-profile.json';
import { getSupabaseClient, isSupabaseConfigured } from '../database/client';
import { logger } from '../utils/logger';
import { getCalendarService } from './calendar.service';

const durationMinutes = profileData.booking.durationMinutes; // 45

export interface BookingDetails {
  conversationId: string;
  callSid?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  requestedService: string;
  appointmentTime: Date; // Start time
}

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  calendarEventId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  service?: string;
  bookingReference?: string;
  reason?: 'occupied' | 'error';
  nextAvailableSlots?: string[]; // ISO string formats
}

export class BookingService {
  public mockBookings: any[] = [];

  getMockBookings(): any[] {
    return this.mockBookings;
  }

  /**
   * Helper to verify if a candidate time is within the company's business hours.
   */
  isWithinBusinessHours(dateTime: Date): boolean {
    const day = dateTime.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const hours = dateTime.getUTCHours();
    const minutes = dateTime.getUTCMinutes();
    const decimalTime = hours + minutes / 60;

    // Sunday (0)
    if (day === 0) {
      return false;
    }

    // Saturday (6): 9:00 AM - 2:00 PM
    if (day === 6) {
      return decimalTime >= 9 && decimalTime < 14;
    }

    // Monday to Friday (1-5): 8:00 AM - 5:00 PM
    return decimalTime >= 8 && decimalTime < 17;
  }

  /**
   * Checks Google Calendar availability for a requested slot.
   * If Google Calendar is not configured, checks database bookings.
   * If database bookings is also unconfigured, checks in-memory bookings.
   */
  async checkAvailability(
    startTime: Date,
  ): Promise<{ available: boolean; overlappingEvents: any[] }> {
    const calendarService = getCalendarService();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    if (calendarService.isConfigured()) {
      const events = await calendarService.listEvents(startTime, endTime);
      const available = events.length === 0;
      return {
        available,
        overlappingEvents: events,
      };
    }

    logger.info('Google Calendar not configured. Falling back to database/memory availability check.');

    if (isSupabaseConfigured()) {
      try {
        const startOfDay = new Date(startTime.getTime());
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(startTime.getTime());
        endOfDay.setUTCHours(23, 59, 59, 999);

        const supabase = getSupabaseClient();
        const { data: bookings, error } = (await (supabase.from('bookings') as any)
          .select('appointment_time, status')
          .eq('status', 'confirmed')
          .gte('appointment_time', startOfDay.toISOString())
          .lte('appointment_time', endOfDay.toISOString())) as { data: any[] | null; error: any };

        if (error) throw error;

        const overlapping = (bookings || []).filter((b: any) => {
          const bStart = new Date(b.appointment_time);
          const bEnd = new Date(bStart.getTime() + durationMinutes * 60 * 1000);
          return startTime < bEnd && bStart < endTime;
        });

        return {
          available: overlapping.length === 0,
          overlappingEvents: overlapping.map(() => ({ summary: 'Existing Database Appointment' })),
        };
      } catch (dbErr) {
        logger.warn(dbErr, 'Database check failed. Falling back to memory array.');
      }
    }

    // In-memory check
    const mockList = (this as any).mockBookings || [];
    const overlapping = mockList.filter((b: any) => {
      if (b.status !== 'confirmed') return false;
      const bStart = new Date(b.appointment_time);
      const bEnd = new Date(bStart.getTime() + durationMinutes * 60 * 1000);
      return startTime < bEnd && bStart < endTime;
    });

    return {
      available: overlapping.length === 0,
      overlappingEvents: overlapping.map(() => ({ summary: 'Existing Mock Appointment' })),
    };
  }

  /**
   * Generates the next three available slots starting from the requested time,
   * stepping by 45 minutes and ensuring they fall within business hours.
   */
  async getNextThreeSlots(startTime: Date): Promise<string[]> {
    const slots: string[] = [];
    let candidate = new Date(startTime.getTime());

    // Loop until we find 3 slots (or limit iterations to prevent infinite loops)
    let iterations = 0;
    while (slots.length < 3 && iterations < 50) {
      iterations++;
      // Move candidate forward by durationMinutes
      candidate = new Date(candidate.getTime() + durationMinutes * 60 * 1000);

      // Check if slot falls in business hours
      if (!this.isWithinBusinessHours(candidate)) {
        // If outside business hours, fast-forward to opening time next day
        const day = candidate.getUTCDay();
        candidate.setUTCHours(8, 0, 0, 0); // Reset to 8 AM UTC
        if (day === 5) {
          // If Friday, skip to Saturday 9 AM
          candidate.setUTCDate(candidate.getUTCDate() + 1);
          candidate.setUTCHours(9, 0, 0, 0);
        } else if (day === 6) {
          // If Saturday, skip to Monday 8 AM
          candidate.setUTCDate(candidate.getUTCDate() + 2);
        } else {
          // Normal weekday increment
          candidate.setUTCDate(candidate.getUTCDate() + 1);
        }
        continue;
      }

      // Check calendar availability for candidate slot
      const { available } = await this.checkAvailability(candidate);
      if (available) {
        slots.push(candidate.toISOString());
      }
    }

    return slots;
  }

  /**
   * Books an appointment: checks availability, schedules in Google Calendar,
   * and persists in Supabase DB.
   */
  async createBooking(details: BookingDetails): Promise<BookingResult> {
    const {
      conversationId,
      callSid,
      customerName,
      customerPhone,
      customerEmail,
      requestedService,
      appointmentTime,
    } = details;

    logger.info({ customerName, appointmentTime, requestedService }, 'Beginning booking process');

    const calendarLatencyStart = performance.now();

    try {
      // 1. Verify availability
      const { available } = await this.checkAvailability(appointmentTime);

      if (!available) {
        logger.info(
          { appointmentTime: appointmentTime.toISOString() },
          'Requested slot is occupied. Querying alternatives.',
        );
        const nextSlots = await this.getNextThreeSlots(appointmentTime);
        return {
          success: false,
          reason: 'occupied',
          nextAvailableSlots: nextSlots,
        };
      }

      // 2. Create Google Calendar Event
      const calendarService = getCalendarService();
      const endTime = new Date(appointmentTime.getTime() + durationMinutes * 60 * 1000);
      let calendarEventId = '';

      if (calendarService.isConfigured()) {
        const calendarEvent = await calendarService.createEvent({
          summary: `Appointment: ${requestedService} - ${customerName}`,
          description: `Customer Phone: ${customerPhone}\nCustomer Email: ${customerEmail || 'N/A'}\nBooked via AI Receptionist\nConversation ID: ${conversationId}`,
          start: {
            dateTime: appointmentTime.toISOString(),
          },
          end: {
            dateTime: endTime.toISOString(),
          },
        });
        if (!calendarEvent.id) {
          throw new Error('Google Calendar event insert succeeded but returned no event ID.');
        }
        calendarEventId = calendarEvent.id;
      } else {
        logger.info('Google Calendar not configured. Skipping event creation, booking will be DB-only.');
        calendarEventId = 'DB_' + Math.random().toString(36).substr(2, 9);
      }

      const calendarLatency = Math.round(performance.now() - calendarLatencyStart);

      // 3. Persist Booking in Supabase
      let savedBooking: any;
      try {
        const supabase = getSupabaseClient();
        const { data, error } = (await (supabase.from('bookings') as any)
          .insert({
            conversation_id: conversationId,
            call_sid: callSid || null,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail || null,
            requested_service: requestedService,
            appointment_time: appointmentTime.toISOString(),
            calendar_event_id: calendarEventId,
            status: 'confirmed',
          })
          .select()
          .single()) as { data: any; error: any };

        if (error) {
          throw error;
        }
        savedBooking = data;
      } catch (dbErr: any) {
        logger.warn(dbErr, 'Supabase insertion failed or client unconfigured. Storing booking in memory as fallback.');
        const mockBooking = {
          id: 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
          conversation_id: conversationId,
          call_sid: callSid || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          requested_service: requestedService,
          appointment_time: appointmentTime.toISOString(),
          calendar_event_id: calendarEventId,
          status: 'confirmed',
          created_at: new Date().toISOString(),
        };
        (this as any).mockBookings = (this as any).mockBookings || [];
        (this as any).mockBookings.push(mockBooking);
        savedBooking = mockBooking;
      }

      logger.info(
        {
          bookingId: savedBooking.id,
          calendarEventId,
          calendarLatencyMs: calendarLatency,
        },
        'Booking creation successful',
      );

      return {
        success: true,
        bookingId: savedBooking.id,
        calendarEventId,
        appointmentDate: appointmentTime.toISOString().split('T')[0],
        appointmentTime: appointmentTime.toISOString().split('T')[1].substring(0, 5),
        service: requestedService,
        bookingReference: savedBooking.id.substring(0, 8).toUpperCase(),
      };
    } catch (err) {
      logger.error(err, 'Failed to complete createBooking operation');
      return {
        success: false,
        reason: 'error',
      };
    }
  }

  /**
   * Reschedules an appointment: updates Google Calendar and Supabase database.
   */
  async rescheduleBooking(bookingId: string, newTime: Date): Promise<boolean> {
    logger.info({ bookingId, newTime: newTime.toISOString() }, 'Rescheduling booking');

    try {
      const supabase = getSupabaseClient();
      const calendarService = getCalendarService();

      // Retrieve existing record
      const { data: booking, error: fetchErr } = (await (supabase
        .from('bookings') as any)
        .select('*')
        .eq('id', bookingId)
        .single()) as { data: any; error: any };

      if (fetchErr || !booking) {
        logger.error({ fetchErr, bookingId }, 'Booking not found in Supabase for reschedule');
        return false;
      }

      // Check availability of new slot
      const { available } = await this.checkAvailability(newTime);
      if (!available) {
        logger.warn({ newTime: newTime.toISOString() }, 'New slot is occupied, reschedule rejected');
        return false;
      }

      // Update Calendar
      const endTime = new Date(newTime.getTime() + durationMinutes * 60 * 1000);
      await calendarService.updateEvent(booking.calendar_event_id, {
        summary: `Appointment: ${booking.requested_service} - ${booking.customer_name}`,
        description: `Customer Phone: ${booking.customer_phone}\nCustomer Email: ${booking.customer_email || 'N/A'}\nBooked via AI Receptionist\nConversation ID: ${booking.conversation_id}`,
        start: { dateTime: newTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
      });

      // Update DB
      const { error: dbErr } = (await (supabase
        .from('bookings') as any)
        .update({
          appointment_time: newTime.toISOString(),
          status: 'rescheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)) as { error: any };

      if (dbErr) {
        logger.error(dbErr, 'Failed to update rescheduled booking in Supabase');
        return false;
      }

      logger.info({ bookingId }, 'Reschedule completed successfully');
      return true;
    } catch (err) {
      logger.error(err, 'Failed to reschedule booking');
      return false;
    }
  }

  /**
   * Cancels a booking: deletes Google Calendar event and updates status in Supabase.
   */
  async cancelBooking(bookingId: string): Promise<boolean> {
    logger.info({ bookingId }, 'Cancelling booking');

    try {
      const supabase = getSupabaseClient();
      const calendarService = getCalendarService();

      // Retrieve existing record
      const { data: booking, error: fetchErr } = (await (supabase
        .from('bookings') as any)
        .select('*')
        .eq('id', bookingId)
        .single()) as { data: any; error: any };

      if (fetchErr || !booking) {
        logger.error({ fetchErr, bookingId }, 'Booking not found for cancellation');
        return false;
      }

      // Delete Google Calendar Event
      try {
        await calendarService.deleteEvent(booking.calendar_event_id);
      } catch (err) {
        logger.warn({ err, bookingId }, 'Event already missing from Google Calendar, proceeding with DB cancellation');
      }

      // Update DB record
      const { error: dbErr } = (await (supabase
        .from('bookings') as any)
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)) as { error: any };

      if (dbErr) {
        logger.error(dbErr, 'Failed to set booking cancellation status in Supabase');
        return false;
      }

      logger.info({ bookingId }, 'Cancellation completed successfully');
      return true;
    } catch (err) {
      logger.error(err, 'Failed to cancel booking');
      return false;
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _bookingServiceInstance: BookingService | null = null;

export function getBookingService(): BookingService {
  if (!_bookingServiceInstance) {
    _bookingServiceInstance = new BookingService();
  }
  return _bookingServiceInstance;
}
