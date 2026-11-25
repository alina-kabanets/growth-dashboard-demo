// Period rules. Weeks are complete UK weeks (Monday to Sunday). Months are
// calendar months, and the month in progress is read to the last day with data.

import {
  addDays,
  addMonths,
  dayMonth,
  monthEnd,
  monthLong,
  monthOfWeek,
  rangeLabel,
  weekStart,
  type ISODate,
} from "./dates";

export type PeriodKind = "week" | "month";

export type Period = {
  kind: PeriodKind;
  /** Monday's date for a week, "YYYY-MM" for a month. */
  key: string;
  from: ISODate;
  /** The last day read. Earlier than `end` only for the month in progress. */
  to: ISODate;
  /** The period's last calendar day. */
  end: ISODate;
  partial: boolean;
  label: string;
  short: string;
};

export function weekPeriod(monday: ISODate): Period {
  const end = addDays(monday, 6);
  return {
    kind: "week",
    key: monday,
    from: monday,
    to: end,
    end,
    partial: false,
    label: rangeLabel(monday, end),
    short: dayMonth(monday),
  };
}

export function monthPeriod(month: string, dataEnd: ISODate): Period {
  const end = monthEnd(month);
  const partial = dataEnd < end;
  const to = partial ? dataEnd : end;
  const name = `${monthLong(month)} ${month.slice(0, 4)}`;
  return {
    kind: "month",
    key: month,
    from: `${month}-01`,
    to,
    end,
    partial,
    label: partial ? `${name}, to ${dayMonth(to)}` : name,
    short: monthLong(month).slice(0, 3),
  };
}

/** Complete weeks only: the week in progress isn't shown until it ends. */
export function weekPeriods(dataStart: ISODate, dataEnd: ISODate): Period[] {
  const out: Period[] = [];
  for (let monday = weekStart(dataStart); addDays(monday, 6) <= dataEnd; monday = addDays(monday, 7)) {
    out.push(weekPeriod(monday));
  }
  return out;
}

export function monthPeriods(dataStart: ISODate, dataEnd: ISODate): Period[] {
  const out: Period[] = [];
  for (let m = dataStart.slice(0, 7); m <= dataEnd.slice(0, 7); m = addMonths(m, 1)) {
    out.push(monthPeriod(m, dataEnd));
  }
  return out;
}

/** The Mondays of the weeks that make up a month, by the Thursday rule. */
export function weeksOfMonth(month: string): ISODate[] {
  const out: ISODate[] = [];
  let monday = weekStart(`${month}-01`);
  if (monthOfWeek(monday) !== month) monday = addDays(monday, 7);
  for (; monthOfWeek(monday) === month; monday = addDays(monday, 7)) out.push(monday);
  return out;
}

/** The same kind of period, `n` periods earlier. */
export function shiftPeriod(period: Period, n: number, dataEnd: ISODate): Period {
  return period.kind === "week"
    ? weekPeriod(addDays(period.key, 7 * n))
    : monthPeriod(addMonths(period.key, n), dataEnd);
}
