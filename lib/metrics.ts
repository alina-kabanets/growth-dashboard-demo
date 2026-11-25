// The shared query layer: one function reads every number for a period.
// Tiles, the table, the staircase and the trends all come from here, so
// they can never disagree.

import { addMonths, daysInMonth, eachDay, monthEnd, daysBetween, type ISODate } from "./dates";
import { shiftPeriod, weeksOfMonth, type Period } from "./periods";
import type { Account, DemoData, DayRow } from "./demo/generate";
import { WEEKLY_WORKSPACE_SHARE, PLAN_ASSUMPTIONS, PLAN_END_MONTH, PLAN_START_MONTH, PLAN_STEPS, RATE_TARGETS } from "./demo/config";

export type Status = "exceeded" | "on-plan" | "close" | "behind" | "no-target" | "no-data";

export type MetricKey =
  | "visits"
  | "signupStart"
  | "mobileSignup"
  | "activation48h"
  | "retention4wk"
  | "freeToPaid"
  | "signups"
  | "workspaces"
  | "paying"
  | "mrr";

export type Reading = {
  key: MetricKey;
  /** null = can't be read for this period; the UI shows a dash and the reason. */
  value: number | null;
  previous: number | null;
  target: number | null;
  /** The full period's target, when the period is still in progress or pro-rated. */
  fullTarget: number | null;
  status: Status;
  /** Counts behind a rate, e.g. 14 of 225 visits. */
  numerator?: number;
  denominator?: number;
  /** Cohort read for lagging metrics, e.g. "Signed up 3–9 May". */
  cohort?: Period;
  missingReason?: string;
};

// ── Status rule ─────────────────────────────────────────────────────────────

/** Exceeded: 25%+ above target. Close: within 10% below. */
export function statusFor(value: number | null, target: number | null): Status {
  if (value === null) return "no-data";
  if (target === null) return "no-target";
  if (target === 0) return value > 0 ? "exceeded" : "on-plan";
  const ratio = value / target;
  if (ratio >= 1.25) return "exceeded";
  if (ratio >= 1) return "on-plan";
  if (ratio >= 0.9) return "close";
  return "behind";
}

// ── Reading raw data ────────────────────────────────────────────────────────

function daysIn(data: DemoData, from: ISODate, to: ISODate): DayRow[] {
  return data.days.filter((d) => d.date >= from && d.date <= to);
}

function sumOrNull(rows: DayRow[], pick: (d: DayRow) => number | null): number | null {
  if (rows.length === 0) return null;
  let total = 0;
  for (const row of rows) {
    const v = pick(row);
    if (v === null) return null;
    total += v;
  }
  return total;
}

function activeOn(account: Account, date: ISODate) {
  return account.start <= date && (account.end === null || account.end > date);
}

export function mrrOn(data: DemoData, date: ISODate) {
  return data.accounts.filter((a) => activeOn(a, date)).reduce((s, a) => s + a.mrr, 0);
}

export function payingOn(data: DemoData, date: ISODate) {
  return data.accounts.filter((a) => activeOn(a, date)).length;
}

/** Accounts that started paying within the period. */
export function newAccounts(data: DemoData, period: Period) {
  return data.accounts.filter((a) => a.start >= period.from && a.start <= period.to);
}

/** Workspace ids that collaborated in the period. A month is built from its weeks (Thursday rule). */
export function collaboratingIds(data: DemoData, period: Period): string[] {
  const mondays = period.kind === "week" ? [period.key] : weeksOfMonth(period.key);
  const ids = new Set<string>();
  for (const monday of mondays) for (const id of data.collaboration[monday] ?? []) ids.add(id);
  return [...ids];
}

// ── The plan ────────────────────────────────────────────────────────────────

type StockKey = "mrr" | "paying" | "workspaces";

/** Plan steps with January filled in from where the company actually was. */
export function planSteps(data: DemoData) {
  const start = monthEnd(PLAN_START_MONTH);
  const steps = { ...PLAN_STEPS };
  steps[PLAN_START_MONTH] = {
    mrr: mrrOn(data, start),
    paying: payingOn(data, start),
    workspaces: collaboratingIds(data, { kind: "month", key: PLAN_START_MONTH } as Period).length,
  };
  return steps;
}

/** The plan's value for a stock metric on a date: a straight line between month ends. */
export function stockTarget(data: DemoData, key: StockKey, date: ISODate): number | null {
  const month = date.slice(0, 7);
  if (month <= PLAN_START_MONTH || month > PLAN_END_MONTH) return null;
  const steps = planSteps(data);
  const prev = steps[addMonths(month, -1)][key];
  const next = steps[month][key];
  const t = Number(date.slice(8, 10)) / daysInMonth(month);
  return prev + (next - prev) * t;
}

/** Monthly flows worked back from the paying-customer staircase. */
export function flowPlan(data: DemoData, month: string) {
  if (month <= PLAN_START_MONTH || month > PLAN_END_MONTH) return null;
  const steps = planSteps(data);
  const before = steps[addMonths(month, -1)].paying;
  const newPaying = steps[month].paying - before + before * PLAN_ASSUMPTIONS.monthlyChurn;
  const signups = newPaying / RATE_TARGETS.freeToPaid.value;
  const visits = signups / PLAN_ASSUMPTIONS.finishRate / RATE_TARGETS.signupStart.value;
  return { signups, visits };
}

/** A flow target summed day by day, so weeks across a month boundary are fair. */
function flowTarget(data: DemoData, key: "signups" | "visits", from: ISODate, to: ISODate): number | null {
  let total = 0;
  for (const date of eachDay(from, to)) {
    const plan = flowPlan(data, date.slice(0, 7));
    if (!plan) return null;
    total += plan[key] / daysInMonth(date.slice(0, 7));
  }
  return total;
}

// ── Readings ────────────────────────────────────────────────────────────────

/** Lagging metrics read an earlier sign-up group, so its window is complete. */
function cohortFor(period: Period, weeksBack: number, dataEnd: ISODate): Period {
  return period.kind === "week" ? shiftPeriod(period, -weeksBack, dataEnd) : shiftPeriod(period, -1, dataEnd);
}

function rate(num: number | null, den: number | null): number | null {
  if (num === null || den === null || den === 0) return null;
  return num / den;
}

type Raw = Omit<Reading, "previous" | "status">;

function readRaw(data: DemoData, period: Period, dataEnd: ISODate): Record<MetricKey, Raw> {
  const rows = daysIn(data, period.from, period.to);
  const visits = sumOrNull(rows, (d) => d.visits);
  const starts = sumOrNull(rows, (d) => d.signupStarts);
  const mobile = sumOrNull(rows, (d) => d.mobileStarts);
  const signups = sumOrNull(rows, (d) => d.signups);
  const activated = sumOrNull(rows, (d) => d.activated);

  const retentionCohort = cohortFor(period, 4, dataEnd);
  const retentionRows = daysIn(data, retentionCohort.from, retentionCohort.to);
  const retained = sumOrNull(retentionRows, (d) => d.retained);
  const cohortActivated = sumOrNull(retentionRows, (d) => d.activated);

  const paidCohort = cohortFor(period, 5, dataEnd);
  const paidRows = daysIn(data, paidCohort.from, paidCohort.to);
  const paid = sumOrNull(paidRows, (d) => d.paid);
  const cohortSignups = sumOrNull(paidRows, (d) => d.signups);

  const fullMonth = period.kind === "month";
  const gapReason = data.gaps.find((g) => g.from <= period.to && g.to >= period.from)?.reason;

  const rateReading = (key: MetricKey, num: number | null, den: number | null, target: number): Raw => ({
    key,
    value: rate(num, den),
    target,
    fullTarget: null,
    numerator: num ?? undefined,
    denominator: den ?? undefined,
    missingReason: num === null || den === null ? gapReason : den === 0 ? "No one in this group yet" : undefined,
  });

  const stock = (key: StockKey, value: number): Raw => {
    // Workspaces are counted per period, so a week's target is a share of the month's.
    const scale = key === "workspaces" && period.kind === "week" ? WEEKLY_WORKSPACE_SHARE : 1;
    const at = (date: ISODate) => {
      const t = stockTarget(data, key, date);
      return t === null ? null : t * scale;
    };
    return { key, value, target: at(period.to), fullTarget: period.partial ? at(period.end) : null };
  };

  const flow = (key: "visits" | "signups", value: number | null): Raw => ({
    key,
    value,
    target: flowTarget(data, key, period.from, period.to),
    fullTarget: fullMonth || period.from.slice(0, 7) === period.end.slice(0, 7)
      ? flowTarget(data, key, `${period.end.slice(0, 7)}-01`, monthEnd(period.end.slice(0, 7)))
      : null,
    missingReason: value === null ? gapReason : undefined,
  });

  return {
    visits: flow("visits", visits),
    signupStart: rateReading("signupStart", starts, visits, RATE_TARGETS.signupStart.value),
    mobileSignup: rateReading("mobileSignup", mobile, starts, RATE_TARGETS.mobileSignup.value),
    activation48h: rateReading("activation48h", activated, signups, RATE_TARGETS.activation48h.value),
    retention4wk: { ...rateReading("retention4wk", retained, cohortActivated, RATE_TARGETS.retention4wk.value), cohort: retentionCohort },
    freeToPaid: { ...rateReading("freeToPaid", paid, cohortSignups, RATE_TARGETS.freeToPaid.value), cohort: paidCohort },
    signups: flow("signups", signups),
    workspaces: stock("workspaces", collaboratingIds(data, period).length),
    paying: stock("paying", payingOn(data, period.to)),
    mrr: stock("mrr", mrrOn(data, period.to)),
  };
}

export function readPeriod(data: DemoData, period: Period, dataEnd: ISODate): Record<MetricKey, Reading> {
  const now = readRaw(data, period, dataEnd);
  const prevPeriod = shiftPeriod(period, -1, dataEnd);
  const before = prevPeriod.from >= data.days[0].date ? readRaw(data, prevPeriod, dataEnd) : null;

  const out = {} as Record<MetricKey, Reading>;
  for (const key of Object.keys(now) as MetricKey[]) {
    const r = now[key];
    out[key] = { ...r, previous: before?.[key].value ?? null, status: statusFor(r.value, r.target) };
  }
  return out;
}

// ── The six numbers and the outcomes ───────────────────────────────────────

export const SIX: { key: MetricKey; n: string; name: string; what: string; collapse?: boolean }[] = [
  { key: "visits", n: "01", name: "Visits", what: "Sessions on the website" },
  { key: "signupStart", n: "02", name: "Sign-up start", what: "Visits that start signing up", collapse: true },
  { key: "mobileSignup", n: "03", name: "Mobile sign-up", what: "Sign-up starts made on a phone", collapse: true },
  { key: "activation48h", n: "04", name: "Activation 48h", what: "Sign-ups who act within 48 hours" },
  { key: "retention4wk", n: "05", name: "Retention 4wk", what: "Activated people still active a month on", collapse: true },
  { key: "freeToPaid", n: "06", name: "Free to paid", what: "Sign-ups who pay within 30 days" },
];

export const OUTCOMES: { key: MetricKey; name: string; what: string }[] = [
  { key: "mrr", name: "MRR", what: "Monthly recurring revenue from software subscriptions" },
  { key: "signups", name: "Sign-ups", what: "New accounts that finished sign-up" },
  { key: "paying", name: "Paying customers", what: "Accounts on a paid plan" },
  { key: "workspaces", name: "Collaborating workspaces", what: "Workspaces with 2+ members where a customer commented or reviewed" },
];

export const LABELS: Record<MetricKey, string> = Object.fromEntries(
  [...SIX, ...OUTCOMES].map((m) => [m.key, m.name]),
) as Record<MetricKey, string>;

export const isRate = (key: MetricKey) =>
  ["signupStart", "mobileSignup", "activation48h", "retention4wk", "freeToPaid"].includes(key);

/**
 * The driver to work on first: the earliest behind driver, collapse points
 * first. If none is behind, the one furthest below its target.
 */
export function workOnFirst(readings: Record<MetricKey, Reading>): MetricKey | null {
  const drivers = SIX.filter((m) => isRate(m.key));
  const behind = drivers.filter((m) => readings[m.key].status === "behind");
  if (behind.length) return (behind.find((m) => m.collapse) ?? behind[0]).key;
  const below = drivers
    .map((m) => ({ key: m.key, ratio: ratioToTarget(readings[m.key]) }))
    .filter((d): d is { key: MetricKey; ratio: number } => d.ratio !== null && d.ratio < 1)
    .sort((a, b) => a.ratio - b.ratio);
  return below[0]?.key ?? null;
}

export function ratioToTarget(r: Reading): number | null {
  return r.value === null || r.target === null || r.target === 0 ? null : r.value / r.target;
}

// ── Staircase ───────────────────────────────────────────────────────────────

export function staircase(data: DemoData, dataEnd: ISODate) {
  const steps = planSteps(data);
  const months = Object.keys(steps).sort();
  return months.map((month) => {
    const end = monthEnd(month);
    const started = `${month}-01` <= dataEnd;
    const read = end <= dataEnd ? end : dataEnd;
    const mix = (date: ISODate) => {
      const active = data.accounts.filter((a) => activeOn(a, date));
      const team = active.filter((a) => a.plan === "Team");
      const business = active.filter((a) => a.plan === "Business");
      return {
        team: team.reduce((s, a) => s + a.mrr, 0),
        business: business.reduce((s, a) => s + a.mrr, 0),
        teamCount: team.length,
        businessCount: business.length,
      };
    };
    return {
      month,
      plan: steps[month].mrr,
      planPaying: steps[month].paying,
      actual: started ? mrrOn(data, read) : null,
      paying: started ? payingOn(data, read) : null,
      partial: started && end > dataEnd,
      mix: started ? mix(read) : null,
      daysRead: started ? daysBetween(`${month}-01`, read) + 1 : 0,
    };
  });
}

