"use client";

import { useActionState, useState } from "react";

import { setPassword, type PasswordState } from "@/app/(admin)/users/actions";

/** "Set password" in a table row: opens a one-field form in place. */
export function SetPassword({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPassword.bind(null, userId), {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="whitespace-nowrap text-sm text-blue">
        {state.saved ? "Password set ✓" : "Set password"}
      </button>
    );
  }

  return (
    <form action={action} className="flex min-w-56 flex-wrap items-center gap-2">
      {/* Shown, not masked: the admin has to read it back to the person. */}
      <input
        name="password" type="text" required minLength={6} autoComplete="off" autoFocus
        aria-label={`New password for ${name}`} placeholder="New password"
        className="w-36 rounded-lg bg-fill px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue"
      />
      <button type="submit" disabled={pending}
        className="rounded-lg bg-green px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
        {state.saved ? "Close" : "Cancel"}
      </button>
      {state.error && <p role="alert" className="basis-full text-xs text-red">{state.error}</p>}
      {state.saved && <p className="basis-full text-xs text-green">Set. Tell {name} the new password.</p>}
    </form>
  );
}
