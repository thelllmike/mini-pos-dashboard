import Link from "next/link";

import { Card, Notice, PageHeader, SectionTitle, Stat, Table, Td, TypeBadge } from "@/components/ui";
import { getShops, getUsers } from "@/lib/data";
import { BUSINESS_LABEL, BUSINESS_TYPES, day, money } from "@/lib/format";

export default async function OverviewPage() {
  const [{ shops, statsMissing }, users] = await Promise.all([getShops(), getUsers()]);

  const sum = (pick: (s: (typeof shops)[number]) => number) => shops.reduce((n, s) => n + pick(s), 0);
  const people = new Set(users.map((u) => u.user_id ?? u.key)).size;
  const unfinished = users.filter((u) => u.shop_id === null).length;
  const activeToday = shops.filter((s) => s.today_bill_count > 0).length;

  return (
    <>
      <PageHeader title="Overview" subtitle="Every shop on Mobile POS, as of now." />
      {statsMissing && <StatsNotice />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Shops" value={String(shops.length)} hint={`${activeToday} billed today`} />
        <Stat label="Users" value={String(people)} hint={unfinished ? `${unfinished} without a shop` : undefined} />
        <Stat label="Sales today" value={money(sum((s) => s.today_sales_cents))} hint={`${sum((s) => s.today_bill_count)} bills`} />
        <Stat label="Sales all time" value={money(sum((s) => s.sales_cents))} hint={`${sum((s) => s.bill_count)} bills`} />
      </div>

      <SectionTitle>By business type</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BUSINESS_TYPES.map((type) => {
          const of = shops.filter((s) => s.business_type === type);
          return (
            <Card key={type} className="p-4">
              <p className="text-sm text-muted">{BUSINESS_LABEL[type]}</p>
              <p className="num mt-1 text-2xl font-bold">{of.length}</p>
              <p className="num mt-1 text-xs text-muted">
                {money(of.reduce((n, s) => n + s.sales_cents, 0))} all time
              </p>
            </Card>
          );
        })}
      </div>

      <SectionTitle>Newest shops</SectionTitle>
      <Table
        empty={shops.length === 0}
        head={[{ label: "Shop" }, { label: "Type" }, { label: "Owner" }, { label: "Registered" }, { label: "Sales today", right: true }]}
      >
        {shops.slice(0, 8).map((s) => (
          <tr key={s.id}>
            <Td><Link href={`/shops/${s.id}`} className="font-medium text-blue">{s.name}</Link></Td>
            <Td><TypeBadge type={s.business_type} /></Td>
            <Td>{s.owner_name ?? "—"}</Td>
            <Td muted>{day(s.created_at)}</Td>
            <Td right>{money(s.today_sales_cents)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function StatsNotice() {
  return (
    <Notice>
      Sales and bill counts show as zero because migration <code>0017_admin_stats.sql</code> has not
      been run on this Supabase project yet.
    </Notice>
  );
}
