// Calendar-date helpers. Dates are plain "YYYY-MM-DD" strings, read as UTC,
// so there is no time-zone drift: a UK week is Monday to Sunday.

export type ISODate = string;

const DAY_MS = 86_400_000;

export function parse(date: ISODate): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function format(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return format(new Date(parse(date).getTime() + days * DAY_MS));
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS);
}

/** Monday of the UK week the date falls in. */
export function weekStart(date: ISODate): ISODate {
  const day = parse(date).getUTCDay(); // 0 = Sunday
  return addDays(date, -((day + 6) % 7));
}

/** The month a week belongs to: the month its Thursday falls in (the ISO rule). */
export function monthOfWeek(monday: ISODate): string {
  return addDays(monday, 3).slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthEnd(month: string): ISODate {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return format(d).slice(0, 7);
}

/** Every date from `from` to `to`, both included. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthShort(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1];
}

export function monthLong(month: string): string {
  return MONTHS_LONG[Number(month.slice(5, 7)) - 1];
}

/** "7 Jun" */
export function dayMonth(date: ISODate): string {
  return `${Number(date.slice(8, 10))} ${monthShort(date.slice(0, 7))}`;
}

/** "7–13 Jun 2027", or "31 May – 6 Jun 2027" across a month boundary. */
export function rangeLabel(from: ISODate, to: ISODate): string {
  const year = to.slice(0, 4);
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${Number(from.slice(8, 10))}–${dayMonth(to)} ${year}`;
  }
  return `${dayMonth(from)} – ${dayMonth(to)} ${year}`;
}
