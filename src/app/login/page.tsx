import { redirect } from "next/navigation";

import { missingEnv } from "@/lib/env";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  const missing = missingEnv();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Mobile POS Admin</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        Sign in with the same phone number and password you use in the app.
      </p>

      {missing.length > 0 ? (
        <div className="rounded-2xl bg-card p-4 text-sm">
          <p className="font-semibold text-orange">Finish setting up first</p>
          <p className="mt-2 text-muted">
            These are still empty in <code>.env.local</code>. Fill them in and restart the server.
          </p>
          <ul className="mt-2 list-disc pl-5">
            {missing.map((name) => <li key={name}><code>{name}</code></li>)}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-4"><LoginForm /></div>
      )}
    </main>
  );
}
