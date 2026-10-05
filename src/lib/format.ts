/** Money is integer cents everywhere, as in the app. Displayed as `Rs. 1,780`. */
export function money(cents: number | null | undefined): string {
  const value = Math.round(Number(cents ?? 0));
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const rupees = Math.trunc(abs / 100).toLocaleString('en-US');
  const rest = abs % 100;
  return `${sign}Rs. ${rupees}${rest ? `.${String(rest).padStart(2, '0')}` : ''}`;
}

const dateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric',
});

export function when(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : '—';
}

export function day(iso: string | null | undefined): string {
  return iso ? dateOnly.format(new Date(iso)) : '—';
}

/** 94771234567 → 077 123 4567, the way a shopkeeper writes it. */
export function phone(raw: string | null | undefined): string {
  if (!raw) return '—';
  const digits = raw.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('94') ? `0${digits.slice(2)}` : digits;
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : raw;
}

export const BUSINESS_TYPES = ['grocery', 'cafe', 'salon'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_LABEL: Record<BusinessType, string> = {
  grocery: 'Grocery',
  cafe: 'Café',
  salon: 'Salon',
};
