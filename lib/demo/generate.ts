// Generates the demo company's raw history: daily funnel rows, paying accounts
// and which workspaces collaborated each week. Every value is invented; the
// seed keeps it identical on every build.

import { addDays, daysBetween, eachDay, weekStart, type ISODate } from "../dates";
import { DATA_END, DATA_START, PLAN_PRICE, type PlanName } from "./config";
import { seeded } from "./random";

export type DayRow = {
  date: ISODate;
  /** null when the reading is missing: shown as a gap, never a zero. */
  visits: number | null;
  signupStarts: number | null;
  mobileStarts: number | null;
  signups: number;
  /** Joined a teammate's workspace by invite: shown, but not counted as a sign-up. */
  invited: number;
  activated: number;
  /** Of the activated, still active four weeks later. */
  retained: number;
  /** Of the sign-ups, paying within 30 days. */
  paid: number;
};

export type Account = {
  id: string;
  name: string;
  plan: PlanName;
  mrr: number;
  start: ISODate;
  end: ISODate | null;
};

export type DemoData = {
  days: DayRow[];
  accounts: Account[];
  /** Monday of the week → ids of accounts whose workspace collaborated. */
  collaboration: Record<ISODate, string[]>;
  /** Days with no website reading, and why. */
  gaps: { from: ISODate; to: ISODate; reason: string }[];
};

const GAP = { from: "2027-01-18", to: "2027-01-24", reason: "Website analytics were missing after a deploy" };

// A smooth ramp between two values across the whole history.
function ramp(date: ISODate, from: number, to: number, start = DATA_START, end = DATA_END) {
  const t = Math.min(1, Math.max(0, daysBetween(start, date) / daysBetween(start, end)));
  return from + (to - from) * t;
}

// Extra visitors from outside events, fading over a few days.
function eventVisits(date: ISODate) {
  const bumps: [ISODate, number, number][] = [
    ["2027-03-10", 1500, 0.35], // webinar: big, short
    ["2027-04-27", 900, 0.6], // launch: smaller, lasts longer
    ["2027-05-19", 650, 0.45], // partner mail-out
  ];
  let extra = 0;
  for (const [day, size, decay] of bumps) {
    const d = daysBetween(day, date);
    if (d >= 0 && d < 10) extra += size * Math.pow(decay, d);
  }
  return extra;
}

function accountName(index: number) {
  return `Workspace ${String(index + 1).padStart(3, "0")}`;
}

export const DEMO_SEED = 276;

export function generateDemo(seed = DEMO_SEED): DemoData {
  const rng = seeded(seed);
  const days: DayRow[] = [];
  const accounts: Account[] = [];
  const propensity = new Map<string, number>();

  const addAccount = (start: ISODate) => {
    const plan: PlanName = rng.next() < 0.72 ? "Team" : "Business";
    const seats = plan === "Team" ? 1 : rng.next() < 0.3 ? 2 : 1;
    const account: Account = {
      id: `ws-${accounts.length + 1}`,
      name: accountName(accounts.length),
      plan,
      mrr: PLAN_PRICE[plan] * seats,
      start,
      end: null,
    };
    accounts.push(account);
    // How likely this workspace is to collaborate in a given week.
    propensity.set(account.id, 0.18 + rng.next() * 0.72);
  };

  // Customers already paying when the history starts.
  for (let i = 0; i < 56; i++) addAccount(addDays(DATA_START, -rng.int(30, 400)));

  // Conversions scheduled for a later day: date → count.
  const pending = new Map<ISODate, number>();

  for (const date of eachDay(DATA_START, DATA_END)) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const holiday = date >= "2026-12-23" && date <= "2027-01-02";
    const inGap = date >= GAP.from && date <= GAP.to;

    const base = ramp(date, 300, 360) * (weekend ? 0.68 : 1) * (holiday ? 0.55 : 1);
    const campaign = eventVisits(date);
    const visits = Math.round(base * rng.jitter(0.18) + campaign);

    // Campaign visitors arrive already interested, so they start sign-up more often.
    const startRate = ramp(date, 0.052, 0.066, DATA_START, "2027-05-01");
    const starts = Math.round(base * startRate * rng.jitter(0.25) + campaign * 0.09);
    const mobileStarts = rng.binomial(starts, ramp(date, 0.21, 0.27));
    const signups = rng.binomial(starts, 0.67);
    const invited = rng.binomial(Math.round(signups * 0.6), 0.2);

    const afterLaunch = date >= "2027-04-27";
    const activated = rng.binomial(signups, afterLaunch ? 0.4 : 0.33);
    const retained = rng.binomial(activated, ramp(date, 0.3, 0.26));
    const paid = rng.binomial(signups, ramp(date, 0.03, 0.035));

    // Paid conversions land 2–30 days after sign-up.
    for (let i = 0; i < paid; i++) {
      const on = addDays(date, rng.int(2, 30));
      pending.set(on, (pending.get(on) ?? 0) + 1);
    }
    for (let i = 0; i < (pending.get(date) ?? 0); i++) addAccount(date);

    // Churn: about 2.5% of paying customers a month.
    for (const account of accounts) {
      if (account.end === null && account.start < date && rng.next() < 0.025 / 30) account.end = date;
    }

    days.push({
      date,
      visits: inGap ? null : visits,
      signupStarts: inGap ? null : starts,
      mobileStarts: inGap ? null : mobileStarts,
      signups,
      invited,
      activated,
      retained,
      paid,
    });
  }

  // Which workspaces collaborated each week. The week in progress only counts
  // the days read so far.
  const collaboration: Record<ISODate, string[]> = {};
  for (let monday = DATA_START; monday <= DATA_END; monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6);
    const share = sunday > DATA_END ? (daysBetween(monday, DATA_END) + 1) / 7 : 1;
    // Collaboration gets a little more common after the launch.
    const lift = monday >= weekStart("2027-04-27") ? 1.12 : 1;
    collaboration[monday] = accounts
      .filter((a) => a.start <= sunday && (a.end === null || a.end > monday))
      .filter((a) => rng.next() < Math.min(0.95, propensity.get(a.id)! * lift) * share)
      .map((a) => a.id);
  }

  return { days, accounts, collaboration, gaps: [GAP] };
}
