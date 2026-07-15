import { google, type calendar_v3 } from 'googleapis';

import { env } from '../config/env';
import { logger } from '../utils/logger';

export class CalendarService {
  private calendar: calendar_v3.Calendar | null = null;
  private readonly calendarId: string;

  constructor() {
    this.calendarId = env.GOOGLE_CALENDAR_ID || 'primary';
    this.initialize();
  }

  private initialize(): void {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
      logger.warn(
        'Google Calendar credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) are not fully configured. Calendar service will fail on requests.',
      );
      return;
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI || 'http://localhost:3000',
      );

      oauth2Client.setCredentials({
        refresh_token: env.GOOGLE_REFRESH_TOKEN,
      });

      this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      logger.info(
        { calendarId: this.calendarId },
        'Google Calendar service initialized successfully',
      );
    } catch (err) {
      logger.error(err, 'Failed to initialize Google Calendar client');
    }
  }

  /**
   * Returns true if the Google Calendar integration has been successfully configured.
   */
  isConfigured(): boolean {
    return this.calendar !== null;
  }

  private getClient(): calendar_v3.Calendar {
    if (!this.calendar) {
      throw new Error(
        'Google Calendar client is not initialized. Please verify configuration credentials.',
      );
    }
    return this.calendar;
  }

  /**
   * Retrieves events within a time range.
   */
  async listEvents(timeMin: Date, timeMax: Date): Promise<calendar_v3.Schema$Event[]> {
    const calendar = this.getClient();
    logger.info(
      { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() },
      'Listing Google Calendar events',
    );

    try {
      const response = await calendar.events.list({
        calendarId: this.calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (err) {
      logger.error(err, 'Error fetching events from Google Calendar');
      throw err;
    }
  }

  /**
   * Creates a calendar event.
   */
  async createEvent(event: calendar_v3.Schema$Event): Promise<calendar_v3.Schema$Event> {
    const calendar = this.getClient();
    logger.info({ summary: event.summary, start: event.start?.dateTime }, 'Creating calendar event');

    try {
      const response = await calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: event,
      });
      return response.data;
    } catch (err) {
      logger.error(err, 'Error creating Google Calendar event');
      throw err;
    }
  }

  /**
   * Updates an existing calendar event.
   */
  async updateEvent(
    eventId: string,
    event: calendar_v3.Schema$Event,
  ): Promise<calendar_v3.Schema$Event> {
    const calendar = this.getClient();
    logger.info({ eventId, summary: event.summary }, 'Updating calendar event');

    try {
      const response = await calendar.events.update({
        calendarId: this.calendarId,
        eventId,
        requestBody: event,
      });
      return response.data;
    } catch (err) {
      logger.error({ err, eventId }, 'Error updating Google Calendar event');
      throw err;
    }
  }

  /**
   * Deletes a calendar event.
   */
  async deleteEvent(eventId: string): Promise<void> {
    const calendar = this.getClient();
    logger.info({ eventId }, 'Deleting calendar event');

    try {
      await calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });
    } catch (err) {
      logger.error({ err, eventId }, 'Error deleting Google Calendar event');
      throw err;
    }
  }

  /**
   * Checks if a slot starting at startTime is free (no overlapping events).
   */
  async checkAvailability(startTime: Date): Promise<boolean> {
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    const events = await this.listEvents(startTime, endTime);
    return events.length === 0;
  }

  /**
   * Gets list of available 45-minute slot times (HH:MM format) for a given date (YYYY-MM-DD).
   */
  async getAvailableSlots(dateStr: string): Promise<string[]> {
    const dayParts = dateStr.split('-');
    if (dayParts.length !== 3) {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
    }
    const year = parseInt(dayParts[0], 10);
    const month = parseInt(dayParts[1], 10) - 1;
    const day = parseInt(dayParts[2], 10);

    const targetDate = new Date(year, month, day);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday

    if (dayOfWeek === 0) {
      return []; // Closed on Sunday
    }

    let startHour = 8;
    let endHour = 17;
    if (dayOfWeek === 6) {
      startHour = 9;
      endHour = 14; // Saturday hours
    }

    const startOfDay = new Date(year, month, day, 0, 0, 0);
    const endOfDay = new Date(year, month, day, 23, 59, 59);
    
    // Fetch all events for this day once
    const dayEvents = await this.listEvents(startOfDay, endOfDay);
    const slots: string[] = [];
    const slotDurationMs = 45 * 60 * 1000;

    let currentSlotStart = new Date(year, month, day, startHour, 0, 0);
    const finalLimit = new Date(year, month, day, endHour, 0, 0);

    while (currentSlotStart.getTime() + slotDurationMs <= finalLimit.getTime()) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDurationMs);

      const hasOverlap = dayEvents.some(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
        
        const overlapStart = Math.max(currentSlotStart.getTime(), eventStart.getTime());
        const overlapEnd = Math.min(currentSlotEnd.getTime(), eventEnd.getTime());
        
        return overlapStart < overlapEnd;
      });

      if (!hasOverlap) {
        const hoursStr = String(currentSlotStart.getHours()).padStart(2, '0');
        const minutesStr = String(currentSlotStart.getMinutes()).padStart(2, '0');
        slots.push(`${hoursStr}:${minutesStr}`);
      }

      currentSlotStart = new Date(currentSlotStart.getTime() + slotDurationMs);
    }

    return slots;
  }

  /**
   * Creates a calendar appointment.
   */
  async createAppointment(details: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    service: string;
    startTime: Date;
  }): Promise<{ eventId: string }> {
    const endTime = new Date(details.startTime.getTime() + 45 * 60 * 1000);
    const event = await this.createEvent({
      summary: `Appointment: ${details.service} - ${details.customerName}`,
      description: `Customer Phone: ${details.customerPhone}\nCustomer Email: ${details.customerEmail || 'N/A'}\nBooked via AI Receptionist`,
      start: {
        dateTime: details.startTime.toISOString(),
      },
      end: {
        dateTime: endTime.toISOString(),
      },
    });

    if (!event.id) {
      throw new Error('Google Calendar event insert succeeded but returned no event ID.');
    }
    return { eventId: event.id };
  }

  /**
   * Cancels a calendar appointment.
   */
  async cancelAppointment(eventId: string): Promise<void> {
    await this.deleteEvent(eventId);
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _calendarServiceInstance: CalendarService | null = null;

export function getCalendarService(): CalendarService {
  if (!_calendarServiceInstance) {
    _calendarServiceInstance = new CalendarService();
  }
  return _calendarServiceInstance;
}
