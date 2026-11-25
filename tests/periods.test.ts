import { describe, expect, it } from "vitest";
import { monthOfWeek, weekStart } from "../lib/dates";
import { monthPeriod, weekPeriods, weeksOfMonth } from "../lib/periods";
import { statusFor } from "../lib/metrics";

describe("weeks", () => {
  it("start on Monday (UK weeks)", () => {
    expect(weekStart("2027-06-13")).toBe("2027-06-07"); // Sunday → Monday before
    expect(weekStart("2027-06-07")).toBe("2027-06-07");
  });
  it("only complete weeks are listed", () => {
    const weeks = weekPeriods("2027-05-31", "2027-06-15"); // 15 Jun is a Tuesday
    expect(weeks.map((w) => w.key)).toEqual(["2027-05-31", "2027-06-07"]);
  });
});

describe("the Thursday rule", () => {
  it("puts a week in the month its Thursday falls in", () => {
    expect(monthOfWeek("2027-05-31")).toBe("2027-06"); // Thu 3 Jun
    expect(monthOfWeek("2027-06-28")).toBe("2027-07"); // Thu 1 Jul
  });
  it("never splits or double-counts a week", () => {
    const may = weeksOfMonth("2027-05");
    const june = weeksOfMonth("2027-06");
    expect(may.at(-1)).toBe("2027-05-24");
    expect(june[0]).toBe("2027-05-31");
    expect(june).toHaveLength(4);
    expect(may.filter((w) => june.includes(w))).toEqual([]);
  });
});

describe("months", () => {
  it("read the month in progress to the last day with data", () => {
    const june = monthPeriod("2027-06", "2027-06-15");
    expect(june.partial).toBe(true);
    expect(june.to).toBe("2027-06-15");
    expect(june.label).toBe("June 2027, to 15 Jun");
  });
});

describe("status", () => {
  it("follows the agreed thresholds", () => {
    expect(statusFor(125, 100)).toBe("exceeded");
    expect(statusFor(100, 100)).toBe("on-plan");
    expect(statusFor(90, 100)).toBe("close");
    expect(statusFor(89, 100)).toBe("behind");
  });
  it("shows a gap, never a zero, when there is no reading", () => {
    expect(statusFor(null, 100)).toBe("no-data");
    expect(statusFor(5, null)).toBe("no-target");
  });
});
