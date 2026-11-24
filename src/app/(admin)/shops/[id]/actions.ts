"use server";

import { revalidatePath } from "next/cache";

import { parseCsv } from "@/lib/csv";
import { importItems, updateShop, type ImportResult } from "@/lib/data";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/format";

export interface SaveState {
  error?: string;
  saved?: boolean;
}

export async function saveShop(id: string, _: SaveState, form: FormData): Promise<SaveState> {
  const name = String(form.get("name") ?? "").trim();
  const nameSi = String(form.get("name_si") ?? "").trim();

  const type = String(form.get("business_type") ?? "");

  if (!BUSINESS_TYPES.includes(type as BusinessType)) return { error: "Pick a business type." };
  if (name.length < 2) return { error: "The shop name needs at least 2 characters." };

  try {
    await updateShop(id, { name, name_si: nameSi || null, business_type: type as BusinessType });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save." };
  }

  revalidatePath(`/shops/${id}`);
  return { saved: true };
}

export interface ImportState {
  error?: string;
  result?: ImportResult;
}

/** The sheet arrives as text; it is parsed again here rather than trusted from the browser. */
export async function importProducts(id: string, _: ImportState, form: FormData): Promise<ImportState> {
  const text = String(form.get("csv") ?? "");
  const overwrite = form.get("overwrite") === "on";

  const parsed = parseCsv(text);
  if (parsed.rows.length === 0) return { error: "That file has no product rows under the header line." };

  try {
    const result = await importItems(id, parsed.rows, overwrite);
    revalidatePath(`/shops/${id}`);
    return { result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not import." };
  }
}
