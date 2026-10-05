import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { env } from './env';

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/**
 * Bypasses RLS: reads and writes across every shop. Only ever used after
 * requireAdmin() — see data.ts, the single place it is called from.
 */
export function adminClient() {
  return createClient(env.supabaseUrl, env.serviceRoleKey, options);
}

/** Used once, to check a phone + password at sign-in. */
export function anonClient() {
  return createClient(env.supabaseUrl, env.anonKey, options);
}
