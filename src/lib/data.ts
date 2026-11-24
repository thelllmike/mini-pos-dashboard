import 'server-only';

import { requireAdmin } from './session';
import { adminClient } from './supabase';
import type { ParsedRow } from './csv';
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

// ------------------------------------------------------------ products (CSV)

export interface ImportResult {
  added: number;
  updated: number;
  priceChanges: number;
  /** Already in the shop and left alone because "update existing" was off. */
  skippedExisting: number;
  /** "Line 7: No selling price" — rows the sheet itself got wrong. */
  rejected: string[];
}

export async function getItemCount(shopId: string): Promise<number> {
  await requireAdmin();
  const { count, error } = await adminClient()
    .from('items').select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId).eq('is_active', true);
  if (error) fail('products', error);
  return count ?? 0;
}

/**
 * Imports a CSV of products into one shop, by the app's rules.
 *
 * - Categories are matched by name without regard to case; missing ones are made.
 * - A barcode already in the shop is that item: updated when `overwrite`, else
 *   left alone. Matched by lookup rather than upsert, because the unique index
 *   on (shop_id, barcode) is partial and ON CONFLICT cannot target it.
 * - Stock is not imported. It moves only through receive_stock() and sales.
 * - One activity_log entry for the whole sheet, so the owner sees it happened.
 */
export async function importItems(shopId: string, rows: ParsedRow[], overwrite: boolean): Promise<ImportResult> {
  const admin = await requireAdmin();
  const db = adminClient();

  const rejected: string[] = [];
  const seenBarcodes = new Set<string>();
  const valid: ParsedRow[] = [];
  for (const row of rows) {
    if (row.errors.length > 0) { rejected.push(`Line ${row.line}: ${row.errors.join(', ')}`); continue; }
    if (row.barcode) {
      if (seenBarcodes.has(row.barcode)) { rejected.push(`Line ${row.line}: barcode ${row.barcode} is on an earlier line too`); continue; }
      seenBarcodes.add(row.barcode);
    }
    valid.push(row);
  }

  const result: ImportResult = { added: 0, updated: 0, priceChanges: 0, skippedExisting: 0, rejected };
  if (valid.length === 0) return result;

  // Categories.
  const cats = await db.from('categories').select('id, name').eq('shop_id', shopId);
  if (cats.error) fail('categories', cats.error);
  const categoryId = new Map((cats.data ?? []).map((c) => [String(c.name).trim().toLowerCase(), String(c.id)]));
  const missing = [...new Set(valid.map((r) => r.category?.trim()).filter((n): n is string => !!n))]
    .filter((n) => !categoryId.has(n.toLowerCase()));
  if (missing.length > 0) {
    const made = await db.from('categories')
      .insert(missing.map((name, i) => ({ shop_id: shopId, name, sort_order: categoryId.size + i })))
      .select('id, name');
    if (made.error) fail('new categories', made.error);
    for (const c of made.data ?? []) categoryId.set(String(c.name).trim().toLowerCase(), String(c.id));
  }

  // Which barcodes the shop already has.
  const existing = new Map<string, { id: string; sell_price_cents: number }>();
  const barcodes = [...seenBarcodes];
  for (let i = 0; i < barcodes.length; i += 200) {
    const found = await db.from('items').select('id, barcode, sell_price_cents')
      .eq('shop_id', shopId).in('barcode', barcodes.slice(i, i + 200));
    if (found.error) fail('existing products', found.error);
    for (const it of found.data ?? []) {
      existing.set(String(it.barcode), { id: String(it.id), sell_price_cents: Number(it.sell_price_cents) });
    }
  }

  const fields = (r: ParsedRow) => ({
    category_id: (r.category && categoryId.get(r.category.trim().toLowerCase())) || null,
    name: r.name,
    name_si: r.nameSi,
    barcode: r.barcode,
    sell_price_cents: r.sellPriceCents,
    cost_price_cents: r.costPriceCents,
    min_stock: r.minStock,
  });

  const fresh: ReturnType<typeof fields>[] = [];
  for (const row of valid) {
    const match = row.barcode ? existing.get(row.barcode) : undefined;
    if (!match) { fresh.push(fields(row)); continue; }
    if (!overwrite) { result.skippedExisting += 1; continue; }

    const { error } = await db.from('items').update({ ...fields(row), is_active: true }).eq('id', match.id);
    if (error) throw new Error(`Could not update line ${row.line}: ${error.message}`);
    result.updated += 1;
    if (match.sell_price_cents !== row.sellPriceCents) result.priceChanges += 1;
  }

  for (let i = 0; i < fresh.length; i += 500) {
    const chunk = fresh.slice(i, i + 500).map((f) => ({ ...f, shop_id: shopId, is_active: true }));
    const { error } = await db.from('items').insert(chunk);
    if (error) throw new Error(`Could not add products: ${error.message}`);
    result.added += chunk.length;
  }

  const log = await db.from('activity_log').insert({
    shop_id: shopId,
    actor_name: 'Platform admin',
    action: 'item.admin_import',
    entity: 'items',
    summary: 'Platform admin imported products from a CSV',
    detail: [
      `${result.added} added`,
      `${result.updated} updated`,
      result.priceChanges ? `${result.priceChanges} price changes` : null,
      result.skippedExisting ? `${result.skippedExisting} already there, left alone` : null,
      result.rejected.length ? `${result.rejected.length} lines refused` : null,
    ].filter(Boolean).join(' · '),
    meta: { admin_phone: admin.phone },
  });
  if (log.error) throw new Error(`Imported, but could not write the activity log: ${log.error.message}`);

  return result;
}

// ------------------------------------------------------------ passwords

/**
 * Sets a person's app password. The old password stops working at once; a
 * handset already signed in stays signed in. Logged in every shop the person
 * belongs to, so the owner sees it.
 */
export async function setUserPassword(userId: string, password: string): Promise<void> {
  const admin = await requireAdmin();
  const db = adminClient();

  const { error } = await db.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(`Could not set the password: ${error.message}`);

  const members = await db.from('shop_users').select('shop_id, display_name').eq('user_id', userId);
  if (members.error) throw new Error(`Password set, but could not write the activity log: ${members.error.message}`);

  if ((members.data ?? []).length > 0) {
    const log = await db.from('activity_log').insert((members.data ?? []).map((m) => ({
      shop_id: m.shop_id,
      actor_name: 'Platform admin',
      action: 'user.admin_password',
      entity: 'shop_users',
      summary: `Platform admin set a new password for ${m.display_name}`,
      meta: { admin_phone: admin.phone, user_id: userId },
    })));
    if (log.error) throw new Error(`Password set, but could not write the activity log: ${log.error.message}`);
  }
}

// ------------------------------------------------------------ trends

export interface DayTotal {
  /** YYYY-MM-DD in Asia/Colombo. */
  date: string;
  cents: number;
  bills: number;
}

const colomboDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit',
});

/**
 * Completed sales per day for the last `days` days, oldest first, with empty
 * days present as zero so the chart has no gaps. Voided bills are left out.
 * Narrow by one shop or by business type.
 */
export async function getDailySales(opts: { shopId?: string; type?: BusinessType; days?: number } = {}): Promise<DayTotal[]> {
  await requireAdmin();
  const db = adminClient();
  const days = opts.days ?? 30;

  let shopIds: string[] | null = opts.shopId ? [opts.shopId] : null;
  if (!shopIds && opts.type) {
    const shops = await db.from('shops').select('id').eq('business_type', opts.type);
    if (shops.error) fail('shops', shops.error);
    shopIds = (shops.data ?? []).map((s) => String(s.id));
    if (shopIds.length === 0) shopIds = ['00000000-0000-0000-0000-000000000000'];
  }

  const totals = new Map<string, DayTotal>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = colomboDate.format(new Date(today.getTime() - i * 86_400_000));
    totals.set(date, { date, cents: 0, bills: 0 });
  }
  const since = new Date(today.getTime() - (days + 1) * 86_400_000).toISOString();

  // Paged: PostgREST returns at most 1000 rows per request.
  for (let from = 0; ; from += 1000) {
    let query = db.from('bills').select('total_cents, business_at')
      .eq('status', 'completed').gte('business_at', since)
      .order('business_at').range(from, from + 999);
    if (shopIds) query = query.in('shop_id', shopIds);
    const { data, error } = await query;
    if (error) fail('sales', error);
    for (const b of data ?? []) {
      const slot = totals.get(colomboDate.format(new Date(String(b.business_at))));
      if (slot) { slot.cents += Number(b.total_cents); slot.bills += 1; }
    }
    if ((data ?? []).length < 1000) break;
  }

  return [...totals.values()];
}

// ------------------------------------------------------------ owner PIN

/**
 * Gives an owner a new admin-area PIN (4–6 digits). Hashed in the database by
 * admin_set_owner_pin() (migration 0019), which also writes activity_log.
 */
export async function setOwnerPin(shopUserId: string, pin: string): Promise<void> {
  const admin = await requireAdmin();
  const { error } = await adminClient().rpc('admin_set_owner_pin', {
    p_shop_user_id: shopUserId, p_pin: pin, p_admin: admin.phone,
  });
  if (!error) return;
  if (/admin_set_owner_pin|schema cache|does not exist/i.test(error.message)) {
    throw new Error('Run migration 0019_admin_set_owner_pin.sql on Supabase first.');
  }
  throw new Error(`Could not set the PIN: ${error.message}`);
}
