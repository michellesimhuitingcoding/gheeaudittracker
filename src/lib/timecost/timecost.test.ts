import { describe, expect, it } from "vitest";
import { jobTimecost } from "@/lib/timecost/timecost";

describe("jobTimecost", () => {
  it("multiplies hours by each person's rate", () => {
    const result = jobTimecost(
      [
        { hours: 2.5, rate: 80 },
        { hours: 1, rate: 120.5 },
      ],
      { hours: null, cost: null },
    );
    expect(result).toMatchObject({ hours: 3.5, cost: 320.5, unratedHours: 0, hoursVariance: null, costVariance: null });
  });

  it("counts hours without a rate separately", () => {
    const result = jobTimecost(
      [
        { hours: 3, rate: null },
        { hours: 1, rate: 50 },
      ],
      { hours: null, cost: null },
    );
    expect(result).toMatchObject({ hours: 4, cost: 50, unratedHours: 3 });
  });

  it("reports actual minus budget", () => {
    const result = jobTimecost([{ hours: 10, rate: 100 }], { hours: 8, cost: 1200 });
    expect(result.hoursVariance).toBe(2);
    expect(result.costVariance).toBe(-200);
  });
});
