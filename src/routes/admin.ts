import type { FastifyInstance } from 'fastify';

import { getCallsListHandler, getDashboardStatsHandler, serveDashboardUiHandler } from '../api/adminHandler';

export function adminRoutes(
  app: FastifyInstance,
  _opts: unknown,
  done: (err?: Error) => void,
): void {
  /**
   * GET /api/admin/stats
   * Retrieve call logs stats metrics.
   */
  app.get('/stats', getDashboardStatsHandler);

  /**
   * GET /api/admin/calls
   * Query and search completed call logs records.
   */
  app.get('/calls', getCallsListHandler);

  /**
   * GET /admin
   * GET /api/admin/dashboard
   * Serves the visual dashboard UI.
   */
  app.get('/dashboard', serveDashboardUiHandler);

  done();
}
export type { adminRoutes as default };
