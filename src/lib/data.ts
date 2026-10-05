import 'server-only';

import { requireAdmin } from './session';
import { adminClient } from './supabase';
import type { BusinessType } from './format';

/**
 * Everything the dashboard reads or writes.
 *
 * Each function starts with requireAdmin(). The service role client is created
 * nowhere else, so there is no way to reach another shop's data without passing
 * that check first.
 */

export interface ShopRow {
  id: string;
  name: string;
  name_si: string | null;
  business_type: BusinessType;
  address: string | null;
  phone: string | null;
  created_at: string;
}

export interface ShopStats {
  user_count: number;
  bill_count: number;
  sales_cents: number;
  today_bill_count: number;
  today_sales_cents: number;
  last_bill_at: string | null;
}

export interface ShopWithStats extends ShopRow, ShopStats {
  owner_name: string | null;
}

export interface Membership {
  id: string;
  shop_id: string;
  user_id: string | null;
  role: 'owner' | 'cashier';
  display_name: string;
  is_active: boolean;
  permissions: Record<string, boolean | number>;
  created_at: string;
}

export interface BillRow {
  id: string;
  shop_id: string;
  bill_no: number;
  status: 'open' | 'held' | 'completed' | 'voided';
  total_cents: number;
  payment_method: string | null;
  cashier_name: string | null;
  business_at: string;
  shop_name?: string;
}

export interface ActivityRow {
  id: string;
  shop_id: string;
  actor_name: string | null;
  action: string;
  summary: string;
  detail: string | null;
  created_at: string;
  shop_name?: string;
}

export interface UserRow {
  key: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  role: 'owner' | 'cashier' | null;
  shop_id: string | null;
  shop_name: string | null;
  is_active: boolean;
  joined_at: string;
  last_sign_in_at: string | null;
}

const EMPTY_STATS: ShopStats = {
  user_count: 0, bill_count: 0, sales_cents: 0,
  today_bill_count: 0, today_sales_cents: 0, last_bill_at: null,
};

const SHOP_COLUMNS = 'id, name, name_si, business_type, address, phone, created_at';
// Named rather than `*` so pin_hash is never read, even though this key could.
const MEMBER_COLUMNS = 'id, shop_id, user_id, role, display_name, is_active, permissions, created_at';
const BILL_COLUMNS = 'id, shop_id, bill_no, status, total_cents, payment_method, cashier_name, business_at';
const ACTIVITY_COLUMNS = 'id, shop_id, actor_name, action, summary, detail, created_at';

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not load ${what}: ${error.message}`);
}

export async function getShops(): Promise<{ shops: ShopWithStats[]; statsMissing: boolean }> {
  await requireAdmin();
  const db = adminClient();

  const [shops, owners, stats] = await Promise.all([
    db.from('shops').select(SHOP_COLUMNS).order('created_at', { ascending: false }),
    db.from('shop_users').select('shop_id, display_name').eq('role', 'owner'),
    db.rpc('admin_shop_stats'),
  ]);
  if (shops.error) fail('shops', shops.error);
  if (owners.error) fail('owners', owners.error);

  const ownerByShop = new Map<string, string>();
  for (const o of owners.data ?? []) ownerByShop.set(o.shop_id, o.display_name);

  // Migration 0017 adds admin_shop_stats(). Until it has been run the shop list
  // still loads, with zeros and a notice, rather than the whole page failing.
  const statsByShop = new Map<string, ShopStats>();
  for (const s of (stats.data ?? []) as (ShopStats & { shop_id: string })[]) {
    statsByShop.set(s.shop_id, {
      user_count: Number(s.user_count),
      bill_count: Number(s.bill_count),
      sales_cents: Number(s.sales_cents),
      today_bill_count: Number(s.today_bill_count),
      today_sales_cents: Number(s.today_sales_cents),
      last_bill_at: s.last_bill_at,
    });
  }

  return {
    statsMissing: !!stats.error,
    shops: ((shops.data ?? []) as ShopRow[]).map((shop) => ({
      ...shop,
      ...(statsByShop.get(shop.id) ?? EMPTY_STATS),
      owner_name: ownerByShop.get(shop.id) ?? null,
    })),
  };
}

export async function getShop(id: string) {
  await requireAdmin();
  const db = adminClient();

  const [shop, members, bills, activity] = await Promise.all([
    db.from('shops').select(SHOP_COLUMNS).eq('id', id).maybeSingle(),
    db.from('shop_users').select(MEMBER_COLUMNS).eq('shop_id', id).order('created_at'),
    db.from('bills').select(BILL_COLUMNS).eq('shop_id', id)
      .order('business_at', { ascending: false }).limit(50),
    db.from('activity_log').select(ACTIVITY_COLUMNS).eq('shop_id', id)
      .order('created_at', { ascending: false }).limit(50),
  ]);
  if (shop.error) fail('the shop', shop.error);
  if (members.error) fail('users', members.error);
  if (bills.error) fail('bills', bills.error);
  if (activity.error) fail('activity', activity.error);
  if (!shop.data) return null;

  const phones = await authPhones();
  const stats = await db.rpc('admin_shop_stats');
  const mine = ((stats.data ?? []) as (ShopStats & { shop_id: string })[]).find((s) => s.shop_id === id);

  return {
    shop: shop.data as ShopRow,
    stats: mine
      ? {
          ...mine,
          bill_count: Number(mine.bill_count),
          sales_cents: Number(mine.sales_cents),
          today_bill_count: Number(mine.today_bill_count),
          today_sales_cents: Number(mine.today_sales_cents),
          user_count: Number(mine.user_count),
        }
      : EMPTY_STATS,
    members: ((members.data ?? []) as Membership[]).map((m) => ({
      ...m,
      phone: m.user_id ? phones.get(m.user_id)?.phone ?? null : null,
      last_sign_in_at: m.user_id ? phones.get(m.user_id)?.last_sign_in_at ?? null : null,
    })),
    bills: (bills.data ?? []) as BillRow[],
    activity: (activity.data ?? []) as ActivityRow[],
  };
}

interface AuthInfo {
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
}

/** Every Supabase Auth account, keyed by user id. Pages through the admin API. */
async function authPhones(): Promise<Map<string, AuthInfo>> {
  const db = adminClient();
  const users = new Map<string, AuthInfo>();

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail('sign-in accounts', error);
    for (const u of data.users) {
      users.set(u.id, {
        phone: u.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        full_name: typeof u.user_metadata?.full_name === 'string' ? u.user_metadata.full_name : null,
      });
    }
    if (data.users.length < 1000) break;
  }
  return users;
}

/**
 * One row per person per shop, plus anyone who signed up and never finished
 * creating a shop — those are worth seeing, they are abandoned registrations.
 */
export async function getUsers(): Promise<UserRow[]> {
  await requireAdmin();
  const db = adminClient();

  const [members, shops, accounts] = await Promise.all([
    db.from('shop_users').select(MEMBER_COLUMNS).order('created_at', { ascending: false }),
    db.from('shops').select('id, name'),
    authPhones(),
  ]);
  if (members.error) fail('users', members.error);
  if (shops.error) fail('shops', shops.error);

  const shopName = new Map<string, string>();
  for (const s of shops.data ?? []) shopName.set(s.id, s.name);

  const rows: UserRow[] = [];
  const seen = new Set<string>();

  for (const m of (members.data ?? []) as Membership[]) {
    const account = m.user_id ? accounts.get(m.user_id) : undefined;
    if (m.user_id) seen.add(m.user_id);
    rows.push({
      key: m.id,
      user_id: m.user_id,
      name: m.display_name,
      phone: account?.phone ?? null,
      role: m.role,
      shop_id: m.shop_id,
      shop_name: shopName.get(m.shop_id) ?? null,
      is_active: m.is_active,
      joined_at: m.created_at,
      last_sign_in_at: account?.last_sign_in_at ?? null,
    });
  }

  for (const [id, account] of accounts) {
    if (seen.has(id)) continue;
    rows.push({
      key: id,
      user_id: id,
      name: account.full_name ?? 'No name',
      phone: account.phone,
      role: null,
      shop_id: null,
      shop_name: null,
      is_active: true,
      joined_at: account.created_at,
      last_sign_in_at: account.last_sign_in_at,
    });
  }

  return rows.sort((a, b) => b.joined_at.localeCompare(a.joined_at));
}

async function shopNames(): Promise<Map<string, string>> {
  const { data, error } = await adminClient().from('shops').select('id, name');
  if (error) fail('shops', error);
  return new Map((data ?? []).map((s) => [s.id as string, s.name as string]));
}

export async function getRecentBills(limit = 200): Promise<BillRow[]> {
  await requireAdmin();
  const [bills, names] = await Promise.all([
    adminClient().from('bills').select(BILL_COLUMNS)
      .order('business_at', { ascending: false }).limit(limit),
    shopNames(),
  ]);
  if (bills.error) fail('bills', bills.error);
  return ((bills.data ?? []) as BillRow[]).map((b) => ({ ...b, shop_name: names.get(b.shop_id) }));
}

export async function getRecentActivity(limit = 200): Promise<ActivityRow[]> {
  await requireAdmin();
  const [activity, names] = await Promise.all([
    adminClient().from('activity_log').select(ACTIVITY_COLUMNS)
      .order('created_at', { ascending: false }).limit(limit),
    shopNames(),
  ]);
  if (activity.error) fail('activity', activity.error);
  return ((activity.data ?? []) as ActivityRow[]).map((a) => ({ ...a, shop_name: names.get(a.shop_id) }));
}

export interface ShopPatch {
  name: string;
  name_si: string | null;
  business_type: BusinessType;
}

/**
 * Renames a shop or changes its business type.
 *
 * Shop owners cannot change the type from the app (migration 0016); the
 * platform admin can, here and only here. It writes activity_log like every
 * other sensitive change, so the owner can see who did it and when.
 */
export async function updateShop(id: string, patch: ShopPatch): Promise<void> {
  const admin = await requireAdmin();
  const db = adminClient();

  const before = await db.from('shops').select('name, name_si, business_type').eq('id', id).single();
  if (before.error) fail('the shop', before.error);

  const changes: string[] = [];
  if (before.data.name !== patch.name) changes.push(`name: ${before.data.name} → ${patch.name}`);
  if ((before.data.name_si ?? null) !== patch.name_si) changes.push('Sinhala name changed');
  if (before.data.business_type !== patch.business_type) {
    changes.push(`type: ${before.data.business_type} → ${patch.business_type}`);
  }
  if (changes.length === 0) return;

  const { error } = await db.from('shops').update(patch).eq('id', id);
  if (error) throw new Error(`Could not save the shop: ${error.message}`);

  const log = await db.from('activity_log').insert({
    shop_id: id,
    actor_name: 'Platform admin',
    action: 'shop.admin_edit',
    entity: 'shops',
    entity_id: id,
    summary: 'Platform admin changed the shop details',
    detail: changes.join(' · '),
    meta: { admin_phone: admin.phone },
  });
  if (log.error) throw new Error(`Saved, but could not write the activity log: ${log.error.message}`);
}
