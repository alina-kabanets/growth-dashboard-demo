import { isRate, type MetricKey, type Reading, type Status } from "./metrics";

const int = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function money(v: number) {
  return `£${int.format(Math.round(v))}`;
}

/** £18.0k, £60k */
export function moneyShort(v: number) {
  if (v < 1000) return `£${Math.round(v)}`;
  const k = v / 1000;
  return `£${k >= 50 || Number.isInteger(k) ? Math.round(k) : k.toFixed(1)}k`;
}

export function count(v: number) {
  return int.format(Math.round(v));
}

export function pct(v: number, digits = 1) {
  return `${(v * 100).toFixed(digits)}%`;
}

/** A metric's value in its own unit. */
export function formatValue(key: MetricKey, v: number | null, opts: { short?: boolean } = {}) {
  if (v === null) return "—";
  if (key === "mrr") return opts.short ? moneyShort(v) : money(v);
  if (isRate(key)) return pct(v, opts.short ? 0 : 1);
  return count(v);
}

/** Target as written in the table: whole percents for rates. */
export function formatTarget(key: MetricKey, v: number | null) {
  if (v === null) return "—";
  if (isRate(key)) return `${Math.round(v * 1000) / 10}%`;
  return formatValue(key, v);
}

export type Delta = { text: string; detail?: string; direction: "up" | "down" | "flat" };

/** Change since the period before: points for rates, amount and percent for the rest. */
export function formatDelta(r: Reading): Delta | null {
  if (r.value === null || r.previous === null) return null;
  const diff = r.value - r.previous;
  const direction = Math.abs(diff) < 1e-9 ? "flat" : diff > 0 ? "up" : "down";
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  if (isRate(r.key)) {
    return { text: `${sign}${Math.abs(diff * 100).toFixed(1)} pts`, direction };
  }
  const amount = r.key === "mrr" ? money(Math.abs(diff)) : count(Math.abs(diff));
  const rel = r.previous === 0 ? null : (diff / r.previous) * 100;
  return {
    text: `${sign}${amount}`,
    detail: rel === null ? undefined : `(${sign}${Math.abs(rel).toFixed(1)}%)`,
    direction,
  };
}

/** "58% of target" or "23% over target" */
export function targetProgress(r: Reading): { fill: number; label: string } | null {
  if (r.value === null || r.target === null || r.target === 0) return null;
  const ratio = r.value / r.target;
  return {
    fill: Math.min(1, ratio),
    label: ratio > 1 ? `${Math.round((ratio - 1) * 100)}% over target` : `${Math.round(ratio * 100)}% of target`,
  };
}

export const STATUS_LABEL: Record<Status, string> = {
  exceeded: "Exceeded",
  "on-plan": "On plan",
  close: "Close",
  behind: "Behind",
  "no-target": "Baseline",
  "no-data": "No reading",
};
