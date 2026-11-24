import 'server-only';

import { scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * The dashboard's own admin password, separate from anyone's app password.
 *
 * `.env.local` holds only `ADMIN_PASSWORD_HASH` = `scrypt:<salt hex>:<hash hex>`,
 * never the password itself. Make one with:
 *
 *   node -e "const c=require('crypto');const s=c.randomBytes(16);console.log('scrypt:'+s.toString('hex')+':'+c.scryptSync(process.argv[1],s,64).toString('hex'))" 'the password'
 */
export function checkAdminPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const given = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
