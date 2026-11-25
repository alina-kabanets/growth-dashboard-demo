"use client";

import { DEFINITIONS } from "@/lib/definitions";
import { count, formatDelta, formatValue, money, targetProgress } from "@/lib/format";
import { monthShort } from "@/lib/dates";
import { OUTCOMES, type MetricKey, type Reading } from "@/lib/metrics";
import type { PeriodView } from "@/lib/dashboard-data";
import { Bar, DeltaText, HoverCard, Popover, StatusPill } from "./ui";

/** The target lines under a bar, shared by the tiles and the table. */
export function targetLines(r: Reading, view: PeriodView): { main: string; note?: string } {
  const p = view.period;
  if (r.target === null) {
    return { main: "No target yet", note: "The plan starts from January’s month end" };
  }
  const month = monthShort(p.end.slice(0, 7));
  const fmt = (v: number) => formatValue(r.key, v);
  if (r.key === "visits" || r.key === "signups") {
    const note = r.fullTarget !== null && (p.kind === "week" || p.partial) ? `${month} target ${fmt(r.fullTarget)}, pro-rated` : undefined;
    return { main: fmt(r.target), note };
  }
  if (p.partial && r.fullTarget !== null) return { main: fmt(r.target), note: `${month} target ${fmt(r.fullTarget)}, pro-rated` };
  if (p.kind === "week") return { main: fmt(r.target), note: "Plan line between month ends" };
  return { main: fmt(r.target) };
}

function breakdown(key: MetricKey, view: PeriodView): string | null {
  const r = view.readings;
  switch (key) {
    case "mrr":
      return `${money(view.mix.team)} Team · ${money(view.mix.business)} Business`;
    case "signups": {
      if (r.signupStart.value === null) return `${count(r.signups.value ?? 0)} finished · +${view.invited} joined by invite (not counted)`;
      return `${count(view.signupStarts ?? 0)} started · +${view.invited} joined by invite (not counted)`;
    }
    case "paying":
      return `${view.mix.teamCount} Team · ${view.mix.businessCount} Business · ${view.newAccounts.length} new · ${view.cancelled} cancelled`;
    case "workspaces":
      return null;
    default:
      return null;
  }
}

function AccountList({ view }: { view: PeriodView }) {
  if (view.newAccounts.length === 0) return <p className="text-muted">No new paying accounts this period.</p>;
  return (
    <ul className="divide-y divide-white/10">
      {view.newAccounts.map((a) => (
        <li key={a.name} className="flex justify-between gap-3 py-2">
          <span className="text-ink">{a.name}</span>
          <span className="text-muted">
            {a.plan} · {money(a.mrr)}/mo · {a.since}
          </span>
        </li>
      ))}
    </ul>
  );
}

function WorkspaceList({ view }: { view: PeriodView }) {
  return (
    <ul className="columns-2 gap-4">
      {view.collaborating.map((name) => (
        <li key={name} className="py-1 text-ink-2">
          {name}
        </li>
      ))}
    </ul>
  );
}

export function OutcomeTiles({ view }: { view: PeriodView }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {OUTCOMES.map((m) => {
        const r = view.readings[m.key];
        const progress = targetProgress(r);
        const lines = targetLines(r, view);
        const extra = breakdown(m.key, view);
        return (
          <article key={m.key} className="flex flex-col rounded-xl bg-surface p-6">
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex items-center gap-2 font-medium text-ink">
                {m.name}
                <HoverCard label={`What ${m.name} means`}>
                  <span className="block font-medium text-ink">{DEFINITIONS[m.key].what}</span>
                  <span className="mt-1 block">{DEFINITIONS[m.key].read}</span>
                </HoverCard>
              </h3>
              <StatusPill status={r.status} />
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-2">
              <p className="text-3xl font-bold text-ink">{formatValue(m.key, r.value)}</p>
              <DeltaText delta={formatDelta(r)} />
            </div>

            {extra && <p className="mt-2 text-xs leading-relaxed text-muted">{extra}</p>}

            <div className="mt-2">
              {(m.key === "mrr" || m.key === "paying") && (
                <Popover label={`See accounts (${view.newAccounts.length})`} title={`New paying accounts · ${view.period.label}`}>
                  <AccountList view={view} />
                </Popover>
              )}
              {m.key === "workspaces" && (
                <Popover label={`See workspaces (${view.collaborating.length})`} title={`Collaborated · ${view.period.label}`}>
                  <WorkspaceList view={view} />
                </Popover>
              )}
            </div>

            <div className="mt-auto pt-6">
              {progress ? <Bar fill={progress.fill} /> : <div className="h-2 rounded-full bg-surface-2" />}
              <p className="mt-2 text-xs text-muted">{progress?.label ?? "Not judged against a target"}</p>
              <p className="mt-2 text-xs text-muted">
                Target <span className="font-medium text-ink">{lines.main}</span>
              </p>
              {lines.note && <p className="text-xs text-muted">{lines.note}</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
