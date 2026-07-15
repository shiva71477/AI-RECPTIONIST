/**
 * Application constants.
 * Keep magic strings and magic numbers out of business logic.
 */

export const APP_NAME = 'ai-receptionist';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

/** HTTP status codes used across the application */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** Default timeouts in milliseconds */
export const TIMEOUTS = {
  /** Outbound HTTP request timeout */
  HTTP_REQUEST: 10_000,
  /** AI model inference timeout */
  AI_INFERENCE: 30_000,
  /** Database query timeout */
  DB_QUERY: 5_000,
  /** Redis operation timeout */
  REDIS_OP: 2_000,
} as const;

/** Redis key prefixes to avoid collisions */
export const REDIS_KEYS = {
  SESSION: 'session:',
  CALL: 'call:',
  RATE_LIMIT: 'rl:',
} as const;
