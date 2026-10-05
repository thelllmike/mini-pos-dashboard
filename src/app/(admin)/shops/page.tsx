import Link from "next/link";

import { SearchBox, Select } from "@/components/Filter";
import { Notice, PageHeader, Table, Td, TypeBadge } from "@/components/ui";
import { getShops } from "@/lib/data";
import { BUSINESS_LABEL, BUSINESS_TYPES, day, money, phone, when } from "@/lib/format";

export default async function ShopsPage({ searchParams }: PageProps<"/shops">) {
  const params = await searchParams;
  const q = String(params.q ?? "").trim();
  const type = String(params.type ?? "");

  const { shops, statsMissing } = await getShops();
  const needle = q.toLowerCase();
  const shown = shops.filter((s) =>
    (!type || s.business_type === type) &&
    (!needle || [s.name, s.name_si, s.owner_name, s.phone, s.address]
      .some((v) => v?.toLowerCase().includes(needle))));

  return (
    <>
      <PageHeader title="Shops" subtitle={`${shown.length} of ${shops.length}`} />
      {statsMissing && (
        <Notice>Run migration <code>0017_admin_stats.sql</code> to see sales and bill counts.</Notice>
      )}

      <SearchBox action="/shops" q={q} placeholder="Shop, owner or phone">
        <Select
          name="type" value={type}
          options={[{ value: "", label: "All types" }, ...BUSINESS_TYPES.map((t) => ({ value: t, label: BUSINESS_LABEL[t] }))]}
        />
      </SearchBox>

      <Table
        empty={shown.length === 0}
        head={[
          { label: "Shop" }, { label: "Type" }, { label: "Owner" }, { label: "Phone" },
          { label: "Users", right: true }, { label: "Bills", right: true },
          { label: "Sales", right: true }, { label: "Last bill" }, { label: "Registered" },
        ]}
      >
        {shown.map((s) => (
          <tr key={s.id}>
            <Td>
              <Link href={`/shops/${s.id}`} className="font-medium text-blue">{s.name}</Link>
              {s.name_si && <span className="block text-xs text-muted">{s.name_si}</span>}
            </Td>
            <Td><TypeBadge type={s.business_type} /></Td>
            <Td>{s.owner_name ?? "—"}</Td>
            <Td muted className="num whitespace-nowrap">{phone(s.phone)}</Td>
            <Td right>{s.user_count}</Td>
            <Td right>{s.bill_count}</Td>
            <Td right className="whitespace-nowrap">{money(s.sales_cents)}</Td>
            <Td muted className="whitespace-nowrap">{when(s.last_bill_at)}</Td>
            <Td muted className="whitespace-nowrap">{day(s.created_at)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
