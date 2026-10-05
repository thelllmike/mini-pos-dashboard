import { notFound } from "next/navigation";

import { Badge, Card, PageHeader, SectionTitle, Stat, StatusBadge, Table, Td, TypeBadge } from "@/components/ui";
import { getShop } from "@/lib/data";
import { day, money, phone, when } from "@/lib/format";
import { EditShop } from "./EditShop";

// The plain sentences from the app's "Users & roles" screen.
const PERMISSIONS: Record<string, string> = {
  make_bills: "Make bills",
  give_discount: "Give discounts",
  delete_bill: "Delete bills",
  see_reports: "See reports",
  give_credit: "Give credit",
};

export default async function ShopPage({ params }: PageProps<"/shops/[id]">) {
  const { id } = await params;
  const data = await getShop(id);
  if (!data) notFound();
  const { shop, stats, members, bills, activity } = data;

  return (
    <>
      <PageHeader
        title={shop.name}
        subtitle={[shop.name_si, shop.address, phone(shop.phone)].filter((v) => v && v !== "—").join(" · ") || undefined}
        back={{ href: "/shops", label: "Shops" }}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
        <TypeBadge type={shop.business_type} />
        <span>Registered {day(shop.created_at)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales today" value={money(stats.today_sales_cents)} hint={`${stats.today_bill_count} bills`} />
        <Stat label="Sales all time" value={money(stats.sales_cents)} hint={`${stats.bill_count} bills`} />
        <Stat label="Users" value={String(members.filter((m) => m.is_active).length)} />
        <Stat label="Last bill" value={stats.last_bill_at ? day(stats.last_bill_at) : "—"} hint={stats.last_bill_at ? when(stats.last_bill_at) : undefined} />
      </div>

      <SectionTitle>Shop details</SectionTitle>
      <Card><EditShop id={shop.id} name={shop.name} nameSi={shop.name_si} type={shop.business_type} /></Card>

      <SectionTitle>Users</SectionTitle>
      <Table
        empty={members.length === 0}
        head={[{ label: "Name" }, { label: "Phone" }, { label: "Role" }, { label: "Can" }, { label: "Last sign-in" }, { label: "Added" }]}
      >
        {members.map((m) => (
          <tr key={m.id}>
            <Td className="font-medium">
              {m.display_name} {!m.is_active && <Badge tone="red">removed</Badge>}
            </Td>
            <Td muted className="num whitespace-nowrap">{phone(m.phone)}</Td>
            <Td><Badge tone={m.role === "owner" ? "blue" : "muted"}>{m.role}</Badge></Td>
            <Td muted className="text-xs">
              {m.role === "owner"
                ? "Everything"
                : Object.entries(PERMISSIONS).filter(([key]) => m.permissions?.[key] === true)
                    .map(([, label]) => label).join(", ") || "Nothing"}
            </Td>
            <Td muted className="whitespace-nowrap">{when(m.last_sign_in_at)}</Td>
            <Td muted className="whitespace-nowrap">{day(m.created_at)}</Td>
          </tr>
        ))}
      </Table>

      <SectionTitle>Latest bills</SectionTitle>
      <Table
        empty={bills.length === 0}
        head={[{ label: "Bill" }, { label: "When" }, { label: "Cashier" }, { label: "Paid by" }, { label: "Status" }, { label: "Total", right: true }]}
      >
        {bills.map((b) => (
          <tr key={b.id}>
            <Td className="num font-medium">#{b.bill_no}</Td>
            <Td muted className="whitespace-nowrap">{when(b.business_at)}</Td>
            <Td>{b.cashier_name ?? "—"}</Td>
            <Td muted>{b.payment_method ?? "—"}</Td>
            <Td><StatusBadge status={b.status} /></Td>
            <Td right className="whitespace-nowrap">{money(b.total_cents)}</Td>
          </tr>
        ))}
      </Table>

      <SectionTitle>Latest activity</SectionTitle>
      <Table empty={activity.length === 0} head={[{ label: "When" }, { label: "What happened" }, { label: "Action" }]}>
        {activity.map((a) => (
          <tr key={a.id}>
            <Td muted className="whitespace-nowrap">{when(a.created_at)}</Td>
            <Td>
              {a.summary}
              {a.detail && <span className="block text-xs text-muted">{a.detail}</span>}
            </Td>
            <Td muted className="text-xs"><code>{a.action}</code></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
