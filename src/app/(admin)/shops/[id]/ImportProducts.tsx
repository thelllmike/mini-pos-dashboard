"use client";

import { useActionState, useState } from "react";

import { CSV_TEMPLATE, parseCsv, type ParseResult } from "@/lib/csv";
import { importProducts, type ImportState } from "./actions";

/**
 * CSV upload for one shop. The file is read and checked in the browser first so
 * the admin sees what will happen before anything is written; the server parses
 * it again and does the import.
 */
export function ImportProducts({ id, itemCount }: { id: string; itemCount: number }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importProducts.bind(null, id), {});
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    setFileError(null);
    setPreview(null);
    setText("");
    setFileName(file?.name ?? null);
    if (!file) return;

    if (/\.(xlsx?|ods|numbers)$/i.test(file.name)) {
      setFileError("That is a spreadsheet file. Save it as CSV (File → Save as → CSV) and pick that.");
      return;
    }
    const content = await file.text();
    const parsed = parseCsv(content);
    if (parsed.rows.length === 0) {
      setFileError("That file has no product rows under the header line.");
      return;
    }
    setText(content);
    setPreview(parsed);
  };

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${CSV_TEMPLATE}`)}`;
  const result = state.result;

  return (
    <form action={action} className="space-y-3 p-4">
      <p className="text-sm text-muted">
        <span className="num font-medium text-text">{itemCount}</span> products now.
        Columns: name, name_si, barcode, sell, cost, min, category. Stock is not imported; it is
        added in the app with Receive stock.{" "}
        <a href={templateHref} download="mobile-pos-items-template.csv" className="text-blue">Download the template</a>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-xl bg-blue px-4 py-2.5 text-sm font-semibold text-white">
          Choose CSV file
          <input type="file" accept=".csv,text/csv,text/plain" className="sr-only"
            onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        <span className="text-sm text-muted">{fileName ?? "No file chosen"}</span>
      </div>

      {fileError && <p role="alert" className="text-sm text-red">{fileError}</p>}

      {preview && (
        <div className="rounded-xl bg-fill p-3 text-sm">
          <p>
            <span className="num font-semibold">{preview.valid.length}</span> rows ready
            {preview.invalid.length > 0 && (
              <>, <span className="num font-semibold text-red">{preview.invalid.length}</span> will be refused</>
            )}.
          </p>
          {preview.unknownColumns.length > 0 && (
            <p className="mt-1 text-xs text-muted">Ignored columns: {preview.unknownColumns.join(", ")}</p>
          )}
          {preview.invalid.length > 0 && (
            <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-xs text-red">
              {preview.invalid.map((r) => <li key={r.line}>Line {r.line}: {r.errors.join(", ")}</li>)}
            </ul>
          )}
        </div>
      )}

      <input type="hidden" name="csv" value={text} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="overwrite" defaultChecked className="size-4 accent-[var(--blue)]" />
        Update products that are already there (matched by barcode)
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit" disabled={pending || !preview || preview.valid.length === 0}
          className="rounded-xl bg-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Importing…" : preview ? `Import ${preview.valid.length} products` : "Import"}
        </button>
        {state.error && <p role="alert" className="text-sm text-red">{state.error}</p>}
      </div>

      {result && (
        <div className="rounded-xl bg-green/10 p-3 text-sm">
          <p className="text-green">
            Done: <span className="num">{result.added}</span> added, <span className="num">{result.updated}</span> updated
            {result.priceChanges > 0 && <> (<span className="num">{result.priceChanges}</span> with a new price)</>}
            {result.skippedExisting > 0 && <>, <span className="num">{result.skippedExisting}</span> already there and left alone</>}.
            The app shows them on its next refresh.
          </p>
          {result.rejected.length > 0 && (
            <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-xs text-red">
              {result.rejected.map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
