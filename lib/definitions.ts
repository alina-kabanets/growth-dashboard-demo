// What each number means, written once and versioned with the code, so a
// metric's definition can't quietly change. The page and hover cards read it.

import type { MetricKey } from "./metrics";

export const DEFINITIONS_VERSION = "v3 · agreed with the founders";

export const DEFINITIONS: Record<MetricKey, { what: string; read: string }> = {
  visits: {
    what: "Sessions on the website.",
    read: "Bot-like sessions and staff visits are left out. A week with no analytics reading shows a gap, not a zero.",
  },
  signupStart: {
    what: "Visits that open sign-up.",
    read: "Sign-up starts divided by visits in the same period. A collapse point: if it stays low, nothing below it can reach its targets.",
  },
  mobileSignup: {
    what: "Sign-up starts made on a phone.",
    read: "Phone sign-up starts divided by all sign-up starts. A collapse point: if phone sign-up is hard, a large share of visitors can't get in.",
  },
  activation48h: {
    what: "New sign-ups who do a first real action within 48 hours.",
    read: "Read for the sign-ups in this period. Sample content added to every new workspace doesn't count as an action.",
  },
  retention4wk: {
    what: "Activated people still active four weeks on.",
    read: "Reads the people who signed up four weeks earlier (the month before, by month), so their four weeks are complete before they count. A collapse point.",
  },
  freeToPaid: {
    what: "Sign-ups who start paying within 30 days.",
    read: "Reads the people who signed up five weeks earlier (the month before, by month), so their 30 days are complete.",
  },
  signups: {
    what: "New accounts that finished sign-up.",
    read: "People who joined a teammate’s workspace by invite are shown but not counted: they didn’t choose the product on their own.",
  },
  workspaces: {
    what: "The north star: workspaces with 2+ members where a customer commented or reviewed.",
    read: "Counted per period. A month is built from its weeks, and a week belongs to the month its Thursday falls in.",
  },
  paying: {
    what: "Accounts on a paid plan at the end of the period.",
    read: "From daily billing snapshots. Staff and test accounts are excluded everywhere by one rule.",
  },
  mrr: {
    what: "Monthly recurring revenue from software subscriptions, in pounds.",
    read: "From daily billing snapshots. Other currencies are converted at that day’s European Central Bank rate. Services sold alongside a deal are not recurring revenue.",
  },
};
