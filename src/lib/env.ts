import 'server-only';

/**
 * Server-side configuration. Nothing here is NEXT_PUBLIC_ — the browser never
 * needs to talk to Supabase directly, and the service role key must never
 * reach it.
 */
export const env = {
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  anonKey: process.env.SUPABASE_ANON_KEY ?? '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  sessionSecret: process.env.SESSION_SECRET ?? '',
  adminPhones: (process.env.ADMIN_PHONES ?? '')
    .split(',')
    .map((p) => normalisePhone(p))
    .filter((p): p is string => p !== null),
};

/** Names of the settings that are still empty, for the setup notice. */
export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push('SUPABASE_URL');
  if (!env.anonKey) missing.push('SUPABASE_ANON_KEY');
  if (!env.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!env.sessionSecret) missing.push('SESSION_SECRET');
  if (env.adminPhones.length === 0) missing.push('ADMIN_PHONES');
  return missing;
}

/**
 * A Sri Lankan mobile number as bare digits with the country code, which is how
 * Supabase stores it: 077 123 4567, +94771234567 and 94771234567 all become
 * 94771234567. Returns null for anything else.
 */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return `94${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('94')) return digits;
  if (digits.length === 9 && digits.startsWith('7')) return `94${digits}`;
  return null;
}
