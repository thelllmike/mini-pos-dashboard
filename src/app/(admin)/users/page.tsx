import Link from "next/link";

import { SearchBox, Select } from "@/components/Filter";
import { Badge, PageHeader, Table, Td } from "@/components/ui";
import { getUsers } from "@/lib/data";
import { day, phone, when } from "@/lib/format";

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const params = await searchParams;
  const q = String(params.q ?? "").trim();
  const role = String(params.role ?? "");

  const users = await getUsers();
  const needle = q.toLowerCase();
  const digits = q.replace(/\D/g, "").replace(/^0/, "");
  const shown = users.filter((u) =>
    (!role || (role === "none" ? u.role === null : u.role === role)) &&
    (!needle ||
      [u.name, u.shop_name].some((v) => v?.toLowerCase().includes(needle)) ||
      (digits.length > 0 && (u.phone ?? "").includes(digits))));

  return (
    <>
      <PageHeader title="Users" subtitle={`${shown.length} of ${users.length} · everyone who can sign in to the app`} />

      <SearchBox action="/users" q={q} placeholder="Name, phone or shop">
        <Select
          name="role" value={role}
          options={[
            { value: "", label: "All roles" }, { value: "owner", label: "Owners" },
            { value: "cashier", label: "Cashiers" }, { value: "none", label: "No shop yet" },
          ]}
        />
      </SearchBox>

      <Table
        empty={shown.length === 0}
        head={[{ label: "Name" }, { label: "Phone" }, { label: "Role" }, { label: "Shop" }, { label: "Last sign-in" }, { label: "Joined" }]}
      >
        {shown.map((u) => (
          <tr key={u.key}>
            <Td className="font-medium">
              {u.name} {!u.is_active && <Badge tone="red">removed</Badge>}
            </Td>
            <Td muted className="num whitespace-nowrap">{phone(u.phone)}</Td>
            <Td>
              {u.role
                ? <Badge tone={u.role === "owner" ? "blue" : "muted"}>{u.role}</Badge>
                : <Badge tone="orange">no shop yet</Badge>}
            </Td>
            <Td>
              {u.shop_id
                ? <Link href={`/shops/${u.shop_id}`} className="text-blue">{u.shop_name ?? "Shop"}</Link>
                : "—"}
            </Td>
            <Td muted className="whitespace-nowrap">{when(u.last_sign_in_at)}</Td>
            <Td muted className="whitespace-nowrap">{day(u.joined_at)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
