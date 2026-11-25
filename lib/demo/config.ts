// Everything in this file is invented for the demo. None of it is Deaku's data.

export const DEMO_TODAY = "2027-06-16"; // a Wednesday
export const DATA_START = "2026-12-07"; // a Monday, 27 weeks back
export const DATA_END = "2027-06-15"; // numbers are read to the end of yesterday

export const PLAN_START_MONTH = "2027-01"; // the staircase starts from January's month end
export const PLAN_END_MONTH = "2027-12";

export type PlanName = "Team" | "Business";
export const PLAN_PRICE: Record<PlanName, number> = { Team: 120, Business: 320 };

// Rate targets for the funnel drivers.
export const RATE_TARGETS = {
  signupStart: { value: 0.075, note: "plan 7–8 in 100" },
  mobileSignup: { value: 0.3, note: "plan 30%+" },
  activation48h: { value: 0.4, note: "plan floor" },
  retention4wk: { value: 0.35, note: "plan 35%+" },
  freeToPaid: { value: 0.04, note: "plan hold 4%, push 5%" },
} as const;

// A week's workspace target is this share of the month's: in a typical
// month, about this share of the collaborating workspaces collaborate in any one week.
export const WEEKLY_WORKSPACE_SHARE = 0.72;

// Planning assumptions used to work visits and sign-ups back from the
// paying-customer staircase.
export const PLAN_ASSUMPTIONS = {
  monthlyChurn: 0.025,
  finishRate: 0.68,
};

// Month-end steps of the plan. January is the starting point.
export const PLAN_STEPS: Record<string, { mrr: number; paying: number; workspaces: number }> = {
  "2027-01": { mrr: 0, paying: 0, workspaces: 0 }, // filled from actuals at generation time
  "2027-02": { mrr: 16_800, paying: 76, workspaces: 68 },
  "2027-03": { mrr: 19_600, paying: 88, workspaces: 76 },
  "2027-04": { mrr: 22_800, paying: 102, workspaces: 86 },
  "2027-05": { mrr: 26_400, paying: 118, workspaces: 98 },
  "2027-06": { mrr: 30_400, paying: 136, workspaces: 112 },
  "2027-07": { mrr: 34_800, paying: 156, workspaces: 128 },
  "2027-08": { mrr: 39_400, paying: 178, workspaces: 145 },
  "2027-09": { mrr: 44_000, paying: 200, workspaces: 165 },
  "2027-10": { mrr: 48_800, paying: 224, workspaces: 185 },
  "2027-11": { mrr: 54_000, paying: 250, workspaces: 208 },
  "2027-12": { mrr: 60_000, paying: 278, workspaces: 232 },
};

// Outside events, drawn as markers on the trend charts.
export const EVENTS = [
  {
    date: "2027-03-10",
    label: "Webinar",
    note: "Founders’ webinar: planning a launch with your team. Wed 10 Mar, 6pm, with a live Q&A.",
  },
  {
    date: "2027-04-27",
    label: "Launch",
    note: "Launch: shared templates, so a new workspace starts from a team’s own setup.",
  },
  {
    date: "2027-05-19",
    label: "Partner mail-out",
    note: "Partner network B emailed its members about the product, with a link to a free trial.",
  },
];
