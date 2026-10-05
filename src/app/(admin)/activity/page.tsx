import Link from "next/link";

import { PageHeader, Table, Td } from "@/components/ui";
import { getRecentActivity } from "@/lib/data";
import { when } from "@/lib/format";

export default async function ActivityPage() {
  const activity = await getRecentActivity();

  return (
    <>
      <PageHeader title="Activity" subtitle="Voids, price changes, stock edits, cash drawer and user changes, newest first" />
      <Table empty={activity.length === 0} head={[{ label: "When" }, { label: "Shop" }, { label: "What happened" }, { label: "Action" }]}>
        {activity.map((a) => (
          <tr key={a.id}>
            <Td muted className="whitespace-nowrap">{when(a.created_at)}</Td>
            <Td><Link href={`/shops/${a.shop_id}`} className="text-blue">{a.shop_name ?? "Shop"}</Link></Td>
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
