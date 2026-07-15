import 'dotenv/config';

/**
 * Centralized environment variable registry.
 *
 * All env vars are validated at startup. The application will exit immediately
 * with a descriptive error if any required variable is missing.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, got: "${raw}"`);
  }
  return parsed;
}

// ── Server ────────────────────────────────────────────────────────────────────
const PORT = optionalEnvNumber('PORT', 3000);
const HOST = optionalEnv('HOST', '0.0.0.0');
const NODE_ENV = optionalEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test';
const LOG_LEVEL = optionalEnv('LOG_LEVEL', 'info');

// ── Security ──────────────────────────────────────────────────────────────────
const CORS_ORIGIN = optionalEnv('CORS_ORIGIN', '*');
const RATE_LIMIT_MAX = optionalEnvNumber('RATE_LIMIT_MAX', 100);
const RATE_LIMIT_WINDOW_MS = optionalEnvNumber('RATE_LIMIT_WINDOW_MS', 60000);

// ── Twilio (loaded when integration is active) ────────────────────────────────
const TWILIO_ACCOUNT_SID = process.env['TWILIO_ACCOUNT_SID'] ?? '';
const TWILIO_AUTH_TOKEN = process.env['TWILIO_AUTH_TOKEN'] ?? '';
const TWILIO_PHONE_NUMBER = process.env['TWILIO_PHONE_NUMBER'] ?? '';
const TWILIO_MEDIA_STREAM_URL = process.env['TWILIO_MEDIA_STREAM_URL'] ?? '';

// ── WhisperFlow ───────────────────────────────────────────────────────────────
const WHISPERFLOW_API_KEY = process.env['WHISPERFLOW_API_KEY'] ?? '';
const WHISPERFLOW_API_URL = process.env['WHISPERFLOW_API_URL'] ?? '';

// ── Google Gemini ─────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env['GEMINI_API_KEY'] ?? '';
const GEMINI_MODEL = optionalEnv('GEMINI_MODEL', 'google/gemini-2.5-flash');

// ── Google Calendar ───────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] ?? '';
const GOOGLE_CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'] ?? '';
const GOOGLE_REDIRECT_URI = process.env['GOOGLE_REDIRECT_URI'] ?? '';
const GOOGLE_CALENDAR_ID = process.env['GOOGLE_CALENDAR_ID'] ?? '';
const GOOGLE_REFRESH_TOKEN = process.env['GOOGLE_REFRESH_TOKEN'] ?? '';


// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env['SUPABASE_URL'] ?? '';
const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

// ── Redis ─────────────────────────────────────────────────────────────────────
const REDIS_URL = optionalEnv('REDIS_URL', 'redis://localhost:6379');

// ── n8n ───────────────────────────────────────────────────────────────────────
const N8N_WEBHOOK_BASE_URL = process.env['N8N_WEBHOOK_BASE_URL'] ?? '';
const N8N_API_KEY = process.env['N8N_API_KEY'] ?? '';

// ── Exported config object ────────────────────────────────────────────────────
export const env = {
  // Server
  PORT,
  HOST,
  NODE_ENV,
  LOG_LEVEL,
  IS_PRODUCTION: NODE_ENV === 'production',
  IS_DEVELOPMENT: NODE_ENV === 'development',

  // Security
  CORS_ORIGIN,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,

  // Twilio
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  TWILIO_MEDIA_STREAM_URL,

  // WhisperFlow
  WHISPERFLOW_API_KEY,
  WHISPERFLOW_API_URL,

  // Google Gemini
  GEMINI_API_KEY,
  GEMINI_MODEL,

  // Google Calendar
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_CALENDAR_ID,
  GOOGLE_REFRESH_TOKEN,

  // Supabase
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,

  // Redis
  REDIS_URL,

  // n8n
  N8N_WEBHOOK_BASE_URL,
  N8N_API_KEY,
} as const;

// Expose a helper for use-site required-field checks
export { requireEnv };
