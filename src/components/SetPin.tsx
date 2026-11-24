"use client";

import { useActionState, useState } from "react";

import { setPin, type PasswordState } from "@/app/(admin)/users/actions";

/** "Set owner PIN" in a table row: for an owner locked out of the app's admin area. */
export function SetPin({ shopUserId, name }: { shopUserId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPin.bind(null, shopUserId), {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="whitespace-nowrap text-sm text-blue">
        {state.saved ? "PIN set ✓" : "Set owner PIN"}
      </button>
    );
  }

  return (
    <form action={action} className="flex min-w-56 flex-wrap items-center gap-2">
      <input
        name="pin" type="text" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} required
        autoComplete="off" autoFocus aria-label={`New owner PIN for ${name}`} placeholder="4–6 digits"
        className="num w-28 rounded-lg bg-fill px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue"
      />
      <button type="submit" disabled={pending}
        className="rounded-lg bg-green px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
        {state.saved ? "Close" : "Cancel"}
      </button>
      {state.error && <p role="alert" className="basis-full text-xs text-red">{state.error}</p>}
      {state.saved && <p className="basis-full text-xs text-green">Set. Tell {name} the new PIN.</p>}
    </form>
  );
}
