/**
 * Copied verbatim from the app (src/features/admin/csv.ts), where it is unit
 * tested. Keep the two identical so a sheet imports the same way in both.
 *
 * CSV parsing for the item import.
 *
 * CSV rather than real .xlsx: a spreadsheet library is megabytes of parser for a
 * format nobody hand-writes, and every tool a shopkeeper might use — Excel,
 * Google Sheets, LibreOffice — exports CSV in two clicks. Pure functions with no
 * imports, so the parsing is unit-tested.
 */

export interface ParsedRow {
  line: number;
  name: string;
  nameSi: string | null;
  barcode: string | null;
  sellPriceCents: number;
  costPriceCents: number;
  stockQty: number;
  minStock: number;
  category: string | null;
  /** Why this row cannot be imported. Empty means it is fine. */
  errors: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  valid: ParsedRow[];
  invalid: ParsedRow[];
  /** Header names we did not recognise, so the user can see what was ignored. */
  unknownColumns: string[];
}

/**
 * Splits one CSV line, honouring quotes.
 *
 * Needed because a Sinhala item name can legitimately contain a comma, and a
 * naive split would silently shift every column after it.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;

    if (inQuotes) {
      if (ch === '"') {
        // A doubled quote inside quotes is an escaped quote.
        if (line[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(field); field = ''; }
    else field += ch;
  }

  out.push(field);
  return out.map((f) => f.trim());
}

/** Header aliases, so a shopkeeper's own column names mostly just work. */
const COLUMNS: Record<string, string[]> = {
  name: ['name', 'item', 'item name', 'product', 'name (english)', 'english'],
  nameSi: ['name_si', 'sinhala', 'name (sinhala)', 'sinhala name'],
  barcode: ['barcode', 'code', 'ean', 'upc'],
  sell: ['sell', 'price', 'sell price', 'selling price', 'retail', 'mrp'],
  cost: ['cost', 'cost price', 'buy', 'buying price', 'purchase price'],
  stock: ['stock', 'qty', 'quantity', 'stock qty', 'on hand'],
  min: ['min', 'min stock', 'minimum', 'reorder', 'warn below'],
  category: ['category', 'group', 'type'],
};

function matchColumn(header: string): string | null {
  const key = header.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(COLUMNS)) {
    if (aliases.includes(key)) return field;
  }
  return null;
}

/**
 * Tolerates "1,250.00", "Rs. 890" and plain "240".
 *
 * Matches the first number rather than stripping non-digits: stripping turns
 * "Rs. 890" into ".890", and Number(".890") is 0.89 — so a Rs. 890 item would
 * import at 89 cents. On a three-hundred-row sheet nobody would notice.
 */
const NUMBER = /(-?\d[\d,]*(?:\.\d+)?)/;

export function parsePrice(value: string): number | null {
  const match = NUMBER.exec(value);
  if (!match) return null;

  const n = Number(match[1]!.replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function parseQty(value: string): number {
  const match = NUMBER.exec(value);
  if (!match) return 0;

  const n = Number(match[1]!.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function parseCsv(text: string): ParseResult {
  // Strip a UTF-8 BOM — Excel on Windows writes one and it corrupts the first
  // header, which would otherwise make "name" unrecognisable.
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { rows: [], valid: [], invalid: [], unknownColumns: [] };
  }

  const headers = splitCsvLine(lines[0]!);
  const mapping = headers.map(matchColumn);
  const unknownColumns = headers.filter((h, i) => mapping[i] === null && h.length > 0);

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const get = (field: string): string => {
      const index = mapping.indexOf(field);
      return index === -1 ? '' : cells[index] ?? '';
    };

    const name = get('name');
    const sell = parsePrice(get('sell'));
    const cost = parsePrice(get('cost'));

    const errors: string[] = [];
    if (!name) errors.push('No name');
    if (sell === null) errors.push('No selling price');
    if (sell !== null && sell === 0) errors.push('Selling price is zero');

    rows.push({
      line: i + 1,
      name,
      nameSi: get('nameSi') || null,
      barcode: get('barcode') || null,
      sellPriceCents: sell ?? 0,
      costPriceCents: cost ?? 0,
      stockQty: parseQty(get('stock')),
      minStock: parseQty(get('min')),
      category: get('category') || null,
      errors,
    });
  }

  return {
    rows,
    valid: rows.filter((r) => r.errors.length === 0),
    invalid: rows.filter((r) => r.errors.length > 0),
    unknownColumns,
  };
}

/** The template a shopkeeper downloads and fills in. */
export const CSV_TEMPLATE = [
  'name,name_si,barcode,sell,cost,stock,min,category',
  'Samba Rice 1kg,සම්බා සහල් 1kg,4791234567890,240,198,64,10,Rice',
  'Milk Powder 400g,කිරිපිටි 400g,,1150,980,20,10,Dairy',
].join('\n');
