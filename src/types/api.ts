/**
 * Shared API response types used across all routes.
 */

/** Standard success envelope */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

/** Standard error envelope */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
  meta?: ApiMeta;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

/** Pagination and request metadata */
export interface ApiMeta {
  reqId?: string;
  timestamp?: string;
  page?: number;
  limit?: number;
  total?: number;
}
