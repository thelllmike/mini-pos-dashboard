# Mobile POS Admin

The platform dashboard for [Mobile POS](../mobile-pos): every shop, every user,
every bill, across all shops. Next.js, server-rendered, talking to the same
Supabase project as the app.

## What is in it

| Page | Shows |
|---|---|
| Overview | Shop and user counts, sales today and all time, split by business type, newest shops |
| Shops | Every shop with owner, users, bills, sales, last bill. Search and filter by type |
| Shop detail | Its users and what each may do, latest 50 bills, latest 50 activity entries. Rename the shop or change its business type |
| Users | Everyone who can sign in, their role and shop, last sign-in. Includes people who signed up and never created a shop |
| Bills | The latest 200 bills across all shops |
| Activity | The latest 200 activity-log entries across all shops |

## Setup

1. **Run the two new migrations** on the Supabase project (SQL Editor), from
   `../mobile-pos/supabase/migrations/`:
   - `0016_lock_business_type.sql` — the app can no longer change a shop's type.
   - `0017_admin_stats.sql` — the per-shop totals this dashboard reads. Without
     it the pages still load, with sales and bill counts at zero and a notice.

2. **Fill in `.env.local`.** The URL, anon key and session secret are already
   there. Two are left for you:
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Project Settings → API.
   - `ADMIN_PHONES` — the phone numbers allowed in, comma-separated
     (`0771234567,0719876543`).

3. `npm run dev` and open <http://localhost:3000>. Sign in with the same phone
   number and password as in the app.

## How access works — read before deploying

- **The service role key bypasses every RLS policy.** It is read only in
  `src/lib/supabase.ts`, on the server. It is not `NEXT_PUBLIC_`, and nothing in
  the browser talks to Supabase.
- **Sign-in is two checks.** The phone must be in `ADMIN_PHONES`, and Supabase
  must accept the password. Then the dashboard sets its own signed, httpOnly
  cookie (12 hours). The allow-list is re-checked on every request, so removing
  a number locks that person out at once.
- **Every function in `src/lib/data.ts` begins with `requireAdmin()`.** That
  file is the only caller of the service role client. Keep it that way: add new
  queries there, not in a page.
- **The one write** is `updateShop()` — shop name and business type — and it
  records an `activity_log` entry (`shop.admin_edit`) the owner can see.

Before putting this on the internet: host it somewhere that keeps
`SUPABASE_SERVICE_ROLE_KEY` as a secret, serve it over HTTPS only, and keep
`ADMIN_PHONES` short.

## Conventions shared with the app

Money is integer cents, shown as `Rs. 1,780`. Dates are Asia/Colombo. Colours
are the app's tokens (`src/app/globals.css`), light and dark.
