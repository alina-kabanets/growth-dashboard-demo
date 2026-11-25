import { generateDemo } from "../lib/demo/generate";
import { DATA_END, DATA_START } from "../lib/demo/config";
import { weekPeriods, monthPeriods } from "../lib/periods";
import { readPeriod, SIX, OUTCOMES, staircase, workOnFirst, isRate } from "../lib/metrics";

const data = generateDemo();
const fmt = (k: string, v: number | null) => v === null ? "—" : isRate(k as never) ? (v * 100).toFixed(1) + "%" : Math.round(v).toLocaleString("en-GB");
const show = (label: string, p: ReturnType<typeof weekPeriods>[number]) => {
  const r = readPeriod(data, p, DATA_END);
  console.log(`\n== ${label}: ${p.label}  work on first: ${workOnFirst(r)}`);
  for (const m of [...OUTCOMES, ...SIX]) {
    const x = r[m.key];
    console.log(`${m.key.padEnd(14)} ${fmt(m.key, x.value).padStart(8)}  prev ${fmt(m.key, x.previous).padStart(8)}  target ${fmt(m.key, x.target).padStart(8)}  full ${fmt(m.key, x.fullTarget).padStart(8)}  ${x.status}${x.numerator !== undefined ? `  (${x.numerator}/${x.denominator})` : ""}`);
  }
};
const weeks = weekPeriods(DATA_START, DATA_END);
const months = monthPeriods(DATA_START, DATA_END);
show("Last week", weeks.at(-1)!);
show("This month", months.at(-1)!);
console.log("\n== Staircase");
for (const s of staircase(data, DATA_END)) console.log(s.month, "plan", s.plan, "actual", s.actual, s.partial ? "(so far)" : "");
console.log("\n== Monthly series (visits, signups, paying, mrr, workspaces)");
for (const p of months) { const r = readPeriod(data, p, DATA_END); console.log(p.key, fmt("visits", r.visits.value), fmt("signups", r.signups.value), r.paying.value, r.mrr.value, r.workspaces.value, "| targets", fmt("v", r.visits.target), fmt("s", r.signups.target), fmt("p", r.paying.target), fmt("m", r.mrr.target), fmt("w", r.workspaces.target)); }
console.log("\n== Weekly visits/workspaces");
console.log(weeks.map(w => { const r = readPeriod(data, w, DATA_END); return `${w.short}:${fmt("v", r.visits.value)}/${r.workspaces.value}`; }).join("  "));
