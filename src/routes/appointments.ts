import type { FastifyInstance } from 'fastify';

import { listUpcomingAppointmentsHandler } from '../api/appointmentsHandler';

export function appointmentsRoutes(
  app: FastifyInstance,
  _opts: unknown,
  done: (err?: Error) => void,
): void {
  /**
   * GET /appointments
   * GET /api/appointments
   * List all upcoming appointments.
   */
  app.get('/', listUpcomingAppointmentsHandler);

  done();
}
export type { appointmentsRoutes as default };
