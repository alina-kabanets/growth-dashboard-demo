"use client";

import { useState } from "react";
import { monthShort } from "@/lib/dates";
import { money, moneyShort } from "@/lib/format";
import type { DashboardData } from "@/lib/dashboard-data";
import { Illustrative, TOOLTIP, cx } from "./ui";

type Step = DashboardData["staircase"][number];

function Breakdown({ step }: { step: Step }) {
  return (
    <div className="space-y-2">
      <p className="font-medium text-ink">
        {monthShort(step.month)} {step.month.slice(0, 4)}
        {step.partial && <span className="font-normal text-muted"> · so far, {step.daysRead} days</span>}
      </p>
      <p className="flex justify-between gap-4">
        <span className="text-muted">Plan, month end</span>
        <span>
          {money(step.plan)} · {step.planPaying} paying
        </span>
      </p>
      {step.actual !== null && step.mix ? (
        <>
          <p className="flex justify-between gap-4">
            <span className="text-muted">{step.partial ? "Actual so far" : "Actual"}</span>
            <span className="font-medium text-ink">
              {money(step.actual)} · {step.paying} paying
            </span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-muted">Team</span>
            <span>
              {money(step.mix.team)} · {step.mix.teamCount}
            </span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-muted">Business</span>
            <span>
              {money(step.mix.business)} · {step.mix.businessCount}
            </span>
          </p>
        </>
      ) : (
        <p className="text-muted">Still ahead: plan only.</p>
      )}
    </div>
  );
}

export function Staircase({ steps, planEnd }: { steps: Step[]; planEnd: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(...steps.map((s) => Math.max(s.plan, s.actual ?? 0)));
  const current = steps.find((s) => s.partial) ?? [...steps].reverse().find((s) => s.actual !== null)!;
  const shown = steps.find((s) => s.month === active);
  const H = 260;

  return (
    <section aria-labelledby="staircase-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="staircase-title" className="flex items-center gap-2 text-base font-medium text-ink">
            MRR staircase <Illustrative />
          </h2>
          <p className="mt-1 text-muted">
            The plan’s month-end steps to {moneyShort(steps.at(-1)!.plan)} MRR by {planEnd}, and where each month ended.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-ink">{money(current.actual ?? 0)}</p>
          <p className="text-xs text-muted">
            {monthShort(current.month)} {current.partial ? "so far" : ""} · plan {money(current.plan)}
          </p>
        </div>
      </div>

      <div className="relative mt-8">
        <div className="flex items-end gap-2 sm:gap-3" style={{ height: H + 24 }}>
          {steps.map((s, i) => {
            const planH = (s.plan / max) * H;
            const actualH = s.actual !== null ? (s.actual / max) * H : 0;
            const isActive = active === s.month;
            return (
              <button
                key={s.month}
                type="button"
                onMouseEnter={() => setActive(s.month)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.month)}
                onBlur={() => setActive(null)}
                aria-label={`${monthShort(s.month)}: plan ${money(s.plan)}${s.actual !== null ? `, actual ${money(s.actual)}${s.partial ? " so far" : ""}` : ""}`}
                className="group relative flex h-full flex-1 flex-col items-center justify-end"
              >
                <span className="mb-1 text-xs text-muted">{moneyShort(s.plan)}</span>
                <span
                  className={cx(
                    "relative w-full overflow-hidden rounded-t-md bg-surface-2 transition-opacity duration-150 ease-in-out",
                    active && !isActive && "opacity-60",
                  )}
                  style={{ height: Math.max(planH, actualH) }}
                >
                  {s.actual !== null && (
                    <span
                      className={cx(
                        "absolute inset-x-0 bottom-0 rounded-t-md",
                        s.partial ? "bg-bar-partial" : "bg-bar",
                      )}
                      style={{ height: actualH }}
                    />
                  )}
                </span>
                <span className="mt-2 text-xs text-ink-2">{i === 0 ? "Start" : monthShort(s.month)}</span>
              </button>
            );
          })}
        </div>
        {shown && (
          <div
            role="status"
            className={`pointer-events-none absolute top-0 left-1/2 z-10 w-72 -translate-x-1/2 ${TOOLTIP}`}
          >
            <Breakdown step={shown} />
          </div>
        )}
      </div>

      <ul className="mt-6 flex flex-wrap gap-4 text-xs text-muted">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-sm bg-surface-2" /> Plan
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-sm bg-bar" /> Actual
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-sm bg-bar-partial" /> This month so far
        </li>
      </ul>
    </section>
  );
}
