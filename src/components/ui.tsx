import Link from "next/link";
import type { ReactNode } from "react";

import { BUSINESS_LABEL, type BusinessType } from "@/lib/format";

export function PageHeader({ title, subtitle, back }: {
  title: string; subtitle?: string; back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-sm text-blue">
          ‹ {back.label}
        </Link>
      )}
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-card ${className}`}>{children}</section>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 mt-8 px-1 text-xs font-medium uppercase tracking-wide text-muted">
      {children}
    </h2>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="num mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="num mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

const TONES = {
  blue: "bg-blue/15 text-blue",
  green: "bg-green/15 text-green",
  orange: "bg-orange/15 text-orange",
  red: "bg-red/15 text-red",
  muted: "bg-fill text-muted",
} as const;

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function TypeBadge({ type }: { type: BusinessType }) {
  const tone = type === "grocery" ? "blue" : type === "cafe" ? "orange" : "green";
  return <Badge tone={tone}>{BUSINESS_LABEL[type]}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "completed" ? "green" : status === "voided" ? "red" : "orange";
  return <Badge tone={tone}>{status}</Badge>;
}

/** A card holding a table that scrolls sideways on a phone instead of the page. */
export function Table({ head, children, empty }: {
  head: { label: string; right?: boolean }[]; children: ReactNode; empty?: boolean;
}) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-separator text-left text-xs text-muted">
            {head.map((h) => (
              <th key={h.label} className={`px-4 py-3 font-medium ${h.right ? "text-right" : ""}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-separator">
          {children}
        </tbody>
      </table>
      {empty && <p className="px-4 py-10 text-center text-sm text-muted">Nothing here yet.</p>}
    </Card>
  );
}

export function Td({ children, right, muted, className = "" }: {
  children: ReactNode; right?: boolean; muted?: boolean; className?: string;
}) {
  return (
    <td className={`px-4 py-3 align-middle ${right ? "num text-right" : ""} ${muted ? "text-muted" : ""} ${className}`}>
      {children}
    </td>
  );
}

export function Notice({ children, tone = "orange" }: { children: ReactNode; tone?: "orange" | "red" | "green" }) {
  const colour = tone === "red" ? "text-red bg-red/10" : tone === "green" ? "text-green bg-green/10" : "text-orange bg-orange/10";
  return <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${colour}`}>{children}</p>;
}
