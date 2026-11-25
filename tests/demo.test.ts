import { describe, expect, it } from "vitest";
import { generateDemo } from "../lib/demo/generate";
import { DATA_END, DATA_START } from "../lib/demo/config";
import { monthPeriods, weekPeriods } from "../lib/periods";
import { collaboratingIds, readPeriod } from "../lib/metrics";

const data = generateDemo();

describe("demo data", () => {
  it("is the same on every build", () => {
    expect(generateDemo()).toEqual(data);
  });
  it("leaves the missing analytics week as a gap", () => {
    const week = weekPeriods(DATA_START, DATA_END).find((w) => w.key === "2027-01-18")!;
    const r = readPeriod(data, week, DATA_END);
    expect(r.visits.value).toBeNull();
    expect(r.signupStart.value).toBeNull();
    expect(r.visits.missingReason).toBeTruthy();
  });
  it("the workspaces tile and its list agree", () => {
    for (const p of [...weekPeriods(DATA_START, DATA_END), ...monthPeriods(DATA_START, DATA_END)]) {
      expect(readPeriod(data, p, DATA_END).workspaces.value).toBe(collaboratingIds(data, p).length);
    }
  });
});
