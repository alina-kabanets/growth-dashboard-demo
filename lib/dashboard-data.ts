// Builds everything the page shows, once, at build time. The client only
// receives this plain object, so the page stays static.

import { addMonths, dayMonth, monthShort, rangeLabel } from "./dates";
import { DATA_END, DATA_START, DEMO_TODAY, EVENTS, PLAN_END_MONTH, RATE_TARGETS } from "./demo/config";
import { generateDemo, type DemoData } from "./demo/generate";
import {
  OUTCOMES,
  SIX,
  collaboratingIds,
  flowPlan,
  newAccounts,
  planSteps,
  readPeriod,
  staircase,
  workOnFirst,
  type MetricKey,
  type Reading,
} from "./metrics";
import { monthPeriods, weekPeriods, type Period, type PeriodKind } from "./periods";

export type AccountRow = { name: string; plan: string; mrr: number; since: string };

export type PeriodView = {
  period: Period;
  readings: Record<MetricKey, Reading>;
  workOnFirst: MetricKey | null;
  newAccounts: AccountRow[];
  cancelled: number;
  collaborating: string[];
  mix: { team: number; business: number; teamCount: number; businessCount: number };
  signupStarts: number | null;
  invited: number;
};

export type TrendPoint = {
  key: string;
  label: string;
  /** Upcoming periods have a target only. */
  future: boolean;
  partial: boolean;
  values: Partial<Record<MetricKey, number | null>>;
  targets: Partial<Record<MetricKey, number | null>>;
};

export type DashboardData = {
  today: string;
  dataEnd: string;
  weeks: PeriodView[];
  months: PeriodView[];
  trends: Record<PeriodKind, TrendPoint[]>;
  staircase: ReturnType<typeof staircase>;
  planEndLabel: string;
  events: { date: string; label: string; note: string }[];
  gaps: DemoData["gaps"];
};

const ALL: MetricKey[] = [...SIX.map((m) => m.key), ...OUTCOMES.map((m) => m.key)];

function view(data: DemoData, period: Period): PeriodView {
  const readings = readPeriod(data, period, DATA_END);
  const active = data.accounts.filter((a) => a.start <= period.to && (a.end === null || a.end > period.to));
  const team = active.filter((a) => a.plan === "Team");
  const business = active.filter((a) => a.plan === "Business");
  const names = new Map(data.accounts.map((a) => [a.id, a.name]));
  const rows = data.days.filter((d) => d.date >= period.from && d.date <= period.to);
  return {
    period,
    readings,
    workOnFirst: workOnFirst(readings),
    newAccounts: newAccounts(data, period).map((a) => ({
      name: a.name,
      plan: a.plan,
      mrr: a.mrr,
      since: dayMonth(a.start),
    })),
    cancelled: data.accounts.filter((a) => a.end !== null && a.end >= period.from && a.end <= period.to).length,
    collaborating: collaboratingIds(data, period).map((id) => names.get(id)!).sort(),
    mix: {
      team: team.reduce((s, a) => s + a.mrr, 0),
      business: business.reduce((s, a) => s + a.mrr, 0),
      teamCount: team.length,
      businessCount: business.length,
    },
    signupStarts: readings.signupStart.numerator ?? null,
    invited: rows.reduce((s, d) => s + d.invited, 0),
  };
}

function toPoint(v: PeriodView): TrendPoint {
  const values: TrendPoint["values"] = {};
  const targets: TrendPoint["targets"] = {};
  for (const key of ALL) {
    values[key] = v.readings[key].value;
    targets[key] = v.readings[key].target;
  }
  return { key: v.period.key, label: v.period.short, future: false, partial: v.period.partial, values, targets };
}

/** Months still to come: the plan only, so the climb ahead is visible. */
function futureMonths(data: DemoData, after: string): TrendPoint[] {
  const steps = planSteps(data);
  const out: TrendPoint[] = [];
  for (let m = addMonths(after, 1); m <= PLAN_END_MONTH; m = addMonths(m, 1)) {
    const flows = flowPlan(data, m);
    out.push({
      key: m,
      label: m.endsWith("-01") ? `${monthShort(m)} ${m.slice(2, 4)}` : monthShort(m),
      future: true,
      partial: false,
      values: {},
      targets: {
        visits: flows?.visits ?? null,
        signups: flows?.signups ?? null,
        mrr: steps[m].mrr,
        paying: steps[m].paying,
        workspaces: steps[m].workspaces,
        signupStart: RATE_TARGETS.signupStart.value,
        mobileSignup: RATE_TARGETS.mobileSignup.value,
        activation48h: RATE_TARGETS.activation48h.value,
        retention4wk: RATE_TARGETS.retention4wk.value,
        freeToPaid: RATE_TARGETS.freeToPaid.value,
      },
    });
  }
  return out;
}

export function buildDashboard(): DashboardData {
  const data = generateDemo();
  const weekList = weekPeriods(DATA_START, DATA_END);
  const monthList = monthPeriods(DATA_START, DATA_END);
  const weeks = weekList.map((p) => view(data, p));
  const months = monthList.map((p) => view(data, p));

  const monthPoints = months.map(toPoint).map((p) =>
    p.key.endsWith("-01") ? { ...p, label: `${monthShort(p.key)} ${p.key.slice(2, 4)}` } : { ...p, label: monthShort(p.key) },
  );


  return {
    today: DEMO_TODAY,
    dataEnd: DATA_END,
    weeks,
    months,
    trends: {
      week: weeks.map(toPoint),
      month: [...monthPoints, ...futureMonths(data, monthList.at(-1)!.key)],
    },
    staircase: staircase(data, DATA_END),
    planEndLabel: `${monthShort(PLAN_END_MONTH)} ${PLAN_END_MONTH.slice(0, 4)}`,
    events: EVENTS,
    gaps: data.gaps,
  };
}

export const RANGE_LABEL = rangeLabel(DATA_START, DATA_END);
