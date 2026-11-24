import Link from "next/link";

import { Select } from "@/components/Filter";
import { SalesChart } from "@/components/SalesChart";
import { Card, PageHeader, SectionTitle, Table, Td, TypeBadge } from "@/components/ui";
import { getDailySales, getShops } from "@/lib/data";
import { BUSINESS_LABEL, BUSINESS_TYPES, money, type BusinessType } from "@/lib/format";

const RANGES = [7, 30, 90] as const;

export default async function TrendsPage({ searchParams }: PageProps<"/trends">) {
  const params = await searchParams;
  const type = BUSINESS_TYPES.includes(String(params.type) as BusinessType) ? (String(params.type) as BusinessType) : undefined;
  const days = RANGES.find((r) => String(r) === String(params.days)) ?? 30;

  const [series, byType, { shops }] = await Promise.all([
    getDailySales({ type, days }),
    Promise.all(BUSINESS_TYPES.map((t) => getDailySales({ type: t, days }))),
    getShops(),
  ]);

  const typeTotals = BUSINESS_TYPES.map((t, i) => ({
    type: t,
    cents: byType[i]!.reduce((n, d) => n + d.cents, 0),
    bills: byType[i]!.reduce((n, d) => n + d.bills, 0),
  }));

  return (
    <>
      <PageHeader title="Trends" subtitle={`Completed sales per day, last ${days} days. Voided bills are left out.`} />

      <form action="/trends" className="mb-4 flex flex-wrap items-center gap-2">
        <Select name="type" value={type ?? ""}
          options={[{ value: "", label: "All shops" }, ...BUSINESS_TYPES.map((t) => ({ value: t, label: BUSINESS_LABEL[t] }))]} />
        <Select name="days" value={String(days)} options={RANGES.map((r) => ({ value: String(r), label: `Last ${r} days` }))} />
        <button type="submit" className="rounded-xl bg-blue px-4 py-2.5 text-sm font-semibold text-white">Show</button>
      </form>

      <SectionTitle>{type ? `${BUSINESS_LABEL[type]} sales` : "All sales"}</SectionTitle>
      <Card className="p-4"><SalesChart days={series} /></Card>

      <SectionTitle>By business type, last {days} days</SectionTitle>
      <Table head={[{ label: "Type" }, { label: "Shops" }, { label: "Bills", right: true }, { label: "Sales", right: true }]}>
        {typeTotals.map((t) => (
          <tr key={t.type}>
            <Td><Link href={`/trends?type=${t.type}&days=${days}`}><TypeBadge type={t.type} /></Link></Td>
            <Td muted className="num">{shops.filter((s) => s.business_type === t.type).length}</Td>
            <Td right>{t.bills.toLocaleString("en-US")}</Td>
            <Td right>{money(t.cents)}</Td>
          </tr>
        ))}
      </Table>
      <p className="mt-2 px-1 text-xs text-muted">Each shop&apos;s own chart is on its page under Shops.</p>
    </>
  );
}
