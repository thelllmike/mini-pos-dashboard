// Sets the dashboard's own admin password: writes its scrypt hash to .env.local.
//   npm run admin-password -- 'the new password'
// Restart `npm run dev` (or redeploy with the new env value) afterwards.
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Give a password of at least 8 characters: npm run admin-password -- \'...\'');
  process.exit(1);
}

const salt = randomBytes(16);
const line = `ADMIN_PASSWORD_HASH=scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;

const file = '.env.local';
const env = existsSync(file) ? readFileSync(file, 'utf8') : '';
const next = /^ADMIN_PASSWORD_HASH=.*$/m.test(env)
  ? env.replace(/^ADMIN_PASSWORD_HASH=.*$/m, line)
  : `${env.replace(/\n?$/, '\n')}${line}\n`;
writeFileSync(file, next);
console.log('Admin password set in .env.local. Restart the dashboard to use it.');
