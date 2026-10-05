"use server";

import { redirect } from "next/navigation";

import { env, missingEnv, normalisePhone } from "@/lib/env";
import { createSession, destroySession } from "@/lib/session";
import { anonClient } from "@/lib/supabase";

export interface LoginState {
  error?: string;
}

// One message for a wrong password and for a number that is not an admin, so
// the form cannot be used to find out which phone numbers are on the list.
const REFUSED = "That phone number and password are not allowed in here.";

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  if (missingEnv().length > 0) return { error: "The dashboard is not set up yet." };

  const phone = normalisePhone(String(form.get("phone") ?? ""));
  const password = String(form.get("password") ?? "");
  if (!phone || !password) return { error: "Enter your phone number and password." };

  if (!env.adminPhones.includes(phone)) return { error: REFUSED };

  const { data, error } = await anonClient().auth.signInWithPassword({
    phone: `+${phone}`,
    password,
  });
  if (error || !data.user) return { error: REFUSED };

  await createSession(phone);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
