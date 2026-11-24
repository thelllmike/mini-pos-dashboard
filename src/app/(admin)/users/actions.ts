"use server";

import { revalidatePath } from "next/cache";

import { setUserPassword } from "@/lib/data";

export interface PasswordState {
  error?: string;
  saved?: boolean;
}

// Supabase's own minimum is 6; the app asks for the same.
const MIN = 6;

export async function setPassword(userId: string, _: PasswordState, form: FormData): Promise<PasswordState> {
  const password = String(form.get("password") ?? "");
  if (password.length < MIN) return { error: `At least ${MIN} characters.` };

  try {
    await setUserPassword(userId, password);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not set the password." };
  }

  revalidatePath("/activity");
  return { saved: true };
}
