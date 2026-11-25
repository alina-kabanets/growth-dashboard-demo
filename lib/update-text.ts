// Turns a period's readings into a plain-text update that can be pasted
// straight into the team chat. Same data as the page, no extra queries.

import type { PeriodView } from "./dashboard-data";
import { formatDelta, formatValue, STATUS_LABEL } from "./format";
import { LABELS, OUTCOMES, SIX, type MetricKey } from "./metrics";

function line(view: PeriodView, key: MetricKey, prefix = "") {
  const r = view.readings[key];
  const delta = formatDelta(r);
  const value = r.value === null ? `— (${r.missingReason ?? "no reading"})` : formatValue(key, r.value);
  const change = delta ? `, ${delta.text}` : "";
  const target = r.target === null ? "" : ` · target ${formatValue(key, r.target)}`;
  return `${prefix}${LABELS[key]}: ${value}${change}${target} · ${STATUS_LABEL[r.status]}`;
}

export function updateText(view: PeriodView, disclaimer: string): string {
  const title = view.period.kind === "week" ? "Weekly update" : "Monthly update";
  const first = view.workOnFirst;
  const parts = [
    `${title} · ${view.period.label}`,
    `(${disclaimer})`,
    "",
    "Outcomes",
    ...OUTCOMES.map((m) => line(view, m.key, "• ")),
    "",
    "The six numbers",
    ...SIX.map((m) => line(view, m.key, `${m.n} `)),
  ];
  if (first) {
    const r = view.readings[first];
    parts.push("", `Work on first: ${LABELS[first]} (${formatValue(first, r.value)} against ${formatValue(first, r.target)})`);
  }
  return parts.join("\n");
}
