import Link from "next/link";

import { PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { getRecentBills } from "@/lib/data";
import { money, when } from "@/lib/format";

export default async function BillsPage() {
  const bills = await getRecentBills();

  return (
    <>
      <PageHeader title="Bills" subtitle={`The latest ${bills.length} across every shop`} />
      <Table
        empty={bills.length === 0}
        head={[{ label: "Shop" }, { label: "Bill" }, { label: "When" }, { label: "Cashier" }, { label: "Paid by" }, { label: "Status" }, { label: "Total", right: true }]}
      >
        {bills.map((b) => (
          <tr key={b.id}>
            <Td><Link href={`/shops/${b.shop_id}`} className="text-blue">{b.shop_name ?? "Shop"}</Link></Td>
            <Td className="num font-medium">#{b.bill_no}</Td>
            <Td muted className="whitespace-nowrap">{when(b.business_at)}</Td>
            <Td>{b.cashier_name ?? "—"}</Td>
            <Td muted>{b.payment_method ?? "—"}</Td>
            <Td><StatusBadge status={b.status} /></Td>
            <Td right className="whitespace-nowrap">{money(b.total_cents)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
