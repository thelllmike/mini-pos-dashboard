"use client";

import { useActionState } from "react";

import { login, type LoginState } from "./actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Phone number</span>
        <input
          name="phone" type="tel" inputMode="tel" autoComplete="username" required
          placeholder="077 123 4567"
          className="w-full rounded-xl bg-fill px-4 py-3 outline-none focus:ring-2 focus:ring-blue"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Password</span>
        <input
          name="password" type="password" autoComplete="current-password" required
          className="w-full rounded-xl bg-fill px-4 py-3 outline-none focus:ring-2 focus:ring-blue"
        />
      </label>

      {state.error && <p role="alert" className="text-sm text-red">{state.error}</p>}

      <button
        type="submit" disabled={pending}
        className="w-full rounded-xl bg-blue px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
