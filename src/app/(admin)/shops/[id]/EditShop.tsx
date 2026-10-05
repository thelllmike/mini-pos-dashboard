"use client";

import { useActionState } from "react";

import { BUSINESS_LABEL, BUSINESS_TYPES, type BusinessType } from "@/lib/format";
import { saveShop, type SaveState } from "./actions";

const field = "w-full rounded-xl bg-fill px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue";

export function EditShop({ id, name, nameSi, type }: {
  id: string; name: string; nameSi: string | null; type: BusinessType;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveShop.bind(null, id), {});

  return (
    <form action={action} className="grid gap-3 p-4 sm:grid-cols-3">
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Shop name</span>
        <input name="name" defaultValue={name} required minLength={2} className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Sinhala name (optional)</span>
        <input name="name_si" defaultValue={nameSi ?? ""} className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Business type</span>
        <select name="business_type" defaultValue={type} className={field}>
          {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{BUSINESS_LABEL[t]}</option>)}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <button
          type="submit" disabled={pending}
          className="rounded-xl bg-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state.error && <p role="alert" className="text-sm text-red">{state.error}</p>}
        {state.saved && <p className="text-sm text-green">Saved. The app shows it after the next sign-in or restart.</p>}
        <p className="basis-full text-xs text-muted">
          Changing the type swaps which tabs and screens the shop sees. Shop owners cannot change
          it from the app; this is the only place it can be done.
        </p>
      </div>
    </form>
  );
}
