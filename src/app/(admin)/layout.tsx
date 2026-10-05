import { Nav } from "@/components/Nav";
import { phone } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { logout } from "../login/actions";

// Every page here reads live data behind a cookie; nothing is prerendered.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
      <aside className="shrink-0 px-4 pt-4 md:w-56 md:py-8">
        <p className="mb-3 px-3 text-lg font-bold tracking-tight">Mobile POS</p>
        <Nav />
        <form action={logout} className="mt-4 hidden px-3 md:block">
          <p className="num text-xs text-muted">{phone(session.phone)}</p>
          <button type="submit" className="mt-1 text-sm text-red">Sign out</button>
        </form>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:py-8">
        {children}
        <form action={logout} className="mt-10 md:hidden">
          <button type="submit" className="text-sm text-red">Sign out</button>
        </form>
      </main>
    </div>
  );
}
