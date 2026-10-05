import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { env } from './env';

/**
 * The dashboard's own session: a signed cookie naming the admin's phone.
 *
 * Supabase proves the password once, at sign-in. After that the dashboard does
 * not hold a Supabase user session at all — every query runs with the service
 * role key, so what needs protecting is "is this browser an allow-listed
 * admin", and an HMAC over { phone, exp } answers exactly that.
 */

const COOKIE = 'mpd_session';
const MAX_AGE_SECONDS = 60 * 60 * 12;

export interface AdminSession {
  phone: string;
  exp: number;
}

function sign(payload: string): string {
  return createHmac('sha256', env.sessionSecret).update(payload).digest('base64url');
}

export async function createSession(phone: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = Buffer.from(JSON.stringify({ phone, exp })).toString('base64url');

  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<AdminSession | null> {
  if (!env.sessionSecret) return null;

  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AdminSession;
    if (session.exp < Date.now() / 1000) return null;
    // Re-checked on every request, so removing a phone from ADMIN_PHONES locks
    // that person out at once rather than when their cookie expires.
    if (!env.adminPhones.includes(session.phone)) return null;
    return session;
  } catch {
    return null;
  }
}

/** Every data function calls this first, so no page can forget the check. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
