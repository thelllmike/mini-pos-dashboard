"use client";

import { useState } from "react";

import type { DayTotal } from "@/lib/data";
import { money } from "@/lib/format";

const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 24, left: 56 };
const GAP = 2;

const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const label = (date: string, long = false) => (long ? longDay : shortDay).format(new Date(`${date}T00:00:00Z`));

/** A round number at or above `max`, so the top gridline reads cleanly. */
function niceMax(max: number): number {
  if (max <= 0) return 100_00;
  const step = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= max) return m * step;
  return 10 * step;
}

/** Rs. 12,000 → "12k", for axis ticks only; tooltips show the full amount. */
function compact(cents: number): string {
  const rupees = cents / 100;
  if (rupees >= 1_000_000) return `${+(rupees / 1_000_000).toFixed(1)}M`;
  if (rupees >= 1_000) return `${+(rupees / 1_000).toFixed(1)}k`;
  return String(Math.round(rupees));
}

/**
 * Daily completed sales as bars. One series, so no legend: the section title
 * names it. Hover (or tap) a day for its total and bill count; the same numbers
 * are in the table under the chart.
 */
export function SalesChart({ days }: { days: DayTotal[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const total = days.reduce((n, d) => n + d.cents, 0);
  const bills = days.reduce((n, d) => n + d.bills, 0);
  const best = days.reduce<DayTotal | null>((b, d) => (d.cents > (b?.cents ?? 0) ? d : b), null);
  const top = niceMax(Math.max(0, ...days.map((d) => d.cents)));

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / Math.max(days.length, 1);
  const barW = Math.max(slot - GAP, 1);
  const y = (cents: number) => PAD.top + plotH - (cents / top) * plotH;
  const ticks = [0, top / 2, top];
  const labelEvery = Math.ceil(days.length / 6);
  const active = hover === null ? null : days[hover];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <p><span className="text-muted">Total </span><span className="num font-semibold">{money(total)}</span></p>
        <p><span className="text-muted">Bills </span><span className="num font-semibold">{bills.toLocaleString("en-US")}</span></p>
        <p><span className="text-muted">Average a day </span><span className="num font-semibold">{money(Math.round(total / Math.max(days.length, 1)))}</span></p>
        {best && <p><span className="text-muted">Best day </span><span className="num font-semibold">{label(best.date, true)} · {money(best.cents)}</span></p>}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
          aria-label={`Daily sales for ${days.length} days, total ${money(total)}`}
          onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--separator)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="num">
                {compact(t)}
              </text>
            </g>
          ))}

          {days.map((d, i) => {
            const x = PAD.left + i * slot + GAP / 2;
            const h = Math.max(PAD.top + plotH - y(d.cents), d.cents > 0 ? 1 : 0);
            const r = Math.min(4, barW / 2, h);
            const base = PAD.top + plotH;
            return (
              <g key={d.date}>
                {h > 0 && (
                  <path
                    d={`M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barW - r} Q${x + barW},${base - h} ${x + barW},${base - h + r} V${base} Z`}
                    fill="var(--blue)" opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted)">{label(d.date)}</text>
                )}
                {/* Hit target: the whole column, not just the bar. */}
                <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} fill="transparent"
                  onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
              </g>
            );
          })}
        </svg>

        {active && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-card px-3 py-2 text-xs shadow-lg ring-1 ring-separator"
            style={{ left: `${((PAD.left + (hover + 0.5) * slot) / W) * 100}%` }}
          >
            <p className="text-muted">{label(active.date, true)}</p>
            <p className="num font-semibold">{money(active.cents)}</p>
            <p className="num text-muted">{active.bills} {active.bills === 1 ? "bill" : "bills"}</p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-blue">Show as a table</summary>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Bills</th>
              <th className="py-1 text-right font-medium">Sales</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.date} className="border-t border-separator">
                <td className="py-1">{label(d.date, true)}</td>
                <td className="num py-1 text-right">{d.bills}</td>
                <td className="num py-1 text-right">{money(d.cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
