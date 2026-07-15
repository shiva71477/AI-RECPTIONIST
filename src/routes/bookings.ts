import type { FastifyInstance } from 'fastify';

import {
  cancelBookingHandler,
  createBookingHandler,
  getBookingHandler,
  rescheduleBookingHandler,
} from '../api/bookingsHandler';

export function bookingsRoutes(
  app: FastifyInstance,
  _opts: unknown,
  done: (err?: Error) => void,
): void {
  // CREATE
  app.post(
    '/',
    {
      schema: {
        description: 'Create a new appointment booking',
        tags: ['Bookings'],
        body: {
          type: 'object',
          required: [
            'conversationId',
            'customerName',
            'customerPhone',
            'requestedService',
            'appointmentTime',
          ],
          properties: {
            conversationId: { type: 'string' },
            customerName: { type: 'string', minLength: 1 },
            customerPhone: { type: 'string', minLength: 1 },
            customerEmail: { type: 'string', format: 'email' },
            requestedService: { type: 'string', minLength: 1 },
            appointmentTime: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    createBookingHandler,
  );

  // READ
  app.get(
    '/:id',
    {
      schema: {
        description: 'Retrieve booking details by ID',
        tags: ['Bookings'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    getBookingHandler,
  );

  // UPDATE (Reschedule)
  app.patch(
    '/:id',
    {
      schema: {
        description: 'Reschedule an existing booking',
        tags: ['Bookings'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['appointmentTime'],
          properties: {
            appointmentTime: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    rescheduleBookingHandler,
  );

  // DELETE (Cancel)
  app.delete(
    '/:id',
    {
      schema: {
        description: 'Cancel an existing booking',
        tags: ['Bookings'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    cancelBookingHandler,
  );

  done();
}
export type { bookingsRoutes as default };
