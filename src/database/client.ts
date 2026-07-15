import { createClient } from '@supabase/supabase-js';

import { env } from '../config/env';
import { logger } from '../utils/logger';

// Lazy client initialization to avoid throwing errors at boot time if keys are not set yet.
let _supabaseClientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_supabaseClientInstance) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing in environment.');
      throw new Error('Supabase client failed to initialize: Missing credentials.');
    }
    _supabaseClientInstance = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      },
    });
    logger.info('Supabase client initialized successfully');
  }
  return _supabaseClientInstance;
}

export function isSupabaseConfigured(): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

