"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { RATE_TARGETS } from "@/lib/demo/config";
import { DEFINITIONS } from "@/lib/definitions";
import { count, formatDelta, formatTarget, formatValue, targetProgress } from "@/lib/format";
import { rangeLabel } from "@/lib/dates";
import { SIX, isRate, type MetricKey, type Reading } from "@/lib/metrics";
import type { PeriodView } from "@/lib/dashboard-data";
import { targetLines } from "./outcomes";
import { Bar, DeltaText, HoverCard, StatusPill } from "./ui";

const OF: Partial<Record<MetricKey, string>> = {
  signupStart: "visits",
  mobileSignup: "sign-up starts",
  activation48h: "sign-ups",
  retention4wk: "still active",
  freeToPaid: "paid",
};

function actualNote(r: Reading): string | null {
  if (r.value === null) return r.missingReason ?? "No reading";
  if (!isRate(r.key) || r.numerator === undefined || r.denominator === undefined) return null;
  if (r.key === "retention4wk") return `${count(r.numerator)} of ${count(r.denominator)} still active`;
  if (r.key === "freeToPaid") return `${count(r.numerator)} of ${count(r.denominator)} paid`;
  return `${count(r.numerator)} of ${count(r.denominator)} ${OF[r.key]}`;
}

function targetNote(r: Reading, view: PeriodView): { main: string; note?: string } {
  if (isRate(r.key)) {
    const t = RATE_TARGETS[r.key as keyof typeof RATE_TARGETS];
    return { main: formatTarget(r.key, t.value), note: t.note };
  }
  return targetLines(r, view);
}

export function LadderTable({ view }: { view: PeriodView }) {
  const vsLabel = view.period.kind === "week" ? "vs week before" : "vs month before";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left">
        <caption className="sr-only">The six numbers for {view.period.label}</caption>
        <thead>
          <tr className="text-xs text-ink-2">
            <th scope="col" className="w-10 rounded-l-xl bg-surface py-3 pl-4 font-medium">
              <span className="sr-only">Step</span>
            </th>
            <th scope="col" className="bg-surface py-3 font-medium">The six numbers</th>
            <th scope="col" className="bg-surface py-3 pr-6 text-right font-medium">Actual</th>
            <th scope="col" className="bg-surface py-3 pr-6 text-right font-medium">{vsLabel}</th>
            <th scope="col" className="w-40 bg-surface py-3 font-medium">To target</th>
            <th scope="col" className="bg-surface py-3 pr-6 text-right font-medium">Target</th>
            <th scope="col" className="w-28 rounded-r-xl bg-surface py-3 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {SIX.map((m) => {
            const r = view.readings[m.key];
            const progress = targetProgress(r);
            const target = targetNote(r, view);
            const first = view.workOnFirst === m.key;
            const note = actualNote(r);
            return (
              <tr key={m.key} className="align-top">
                <td className="border-b border-line py-4 pl-4 text-xs text-muted">
                  {m.n}
                </td>
                <td className="border-b border-line py-4 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      {m.name}
                      <HoverCard label={`What ${m.name} means`}>
                        <span className="block font-medium text-ink">{DEFINITIONS[m.key].what}</span>
                        <span className="mt-1 block">{DEFINITIONS[m.key].read}</span>
                      </HoverCard>
                    </span>
                    {m.collapse && (
                      <span className="rounded-full bg-surface px-2 py-1 text-xs leading-none text-ink-2">Collapse point</span>
                    )}
                    {first && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-xs leading-none font-medium text-amber-600 dark:text-amber-400">
                        <ArrowUpRightIcon aria-hidden weight="bold" className="size-3" />
                        Work on first
                      </span>
                    )}
                  </div>
                  {r.cohort && (
                    <p className="mt-1 text-xs text-muted">Signed up {rangeLabel(r.cohort.from, r.cohort.to)}</p>
                  )}
                </td>
                <td className="border-b border-line py-4 pr-6 text-right">
                  <p className="text-sm font-semibold text-ink">{formatValue(m.key, r.value)}</p>
                  {note && <p className="mt-1 text-xs text-muted">{note}</p>}
                </td>
                <td className="border-b border-line py-4 pr-6 text-right">
                  <DeltaText delta={formatDelta(r)} compact />
                </td>
                <td className="border-b border-line py-4 pr-6">
                  <div className="pt-2">
                    {progress ? <Bar fill={progress.fill} /> : <div className="h-2 rounded-full bg-surface-2" />}
                  </div>
                  <p className="mt-2 text-xs text-muted">{progress?.label ?? "—"}</p>
                </td>
                <td className="border-b border-line py-4 pr-6 text-right">
                  <p className="text-ink">{target.main}</p>
                  {target.note && <p className="mt-1 text-xs text-muted">{target.note}</p>}
                </td>
                <td className="border-b border-line py-4 pr-4">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
