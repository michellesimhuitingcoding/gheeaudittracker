import { describe, expect, it } from "vitest";
import { hourlyRateSchema, jobBudgetSchema, publicHolidaySchema } from "@/lib/timecost/schema";

describe("hourlyRateSchema", () => {
  it("accepts an amount and clears on blank", () => {
    expect(hourlyRateSchema.parse({ hourlyRate: "85.50" })).toEqual({ hourlyRate: 85.5 });
    expect(hourlyRateSchema.parse({ hourlyRate: " " })).toEqual({ hourlyRate: null });
  });

  it("rejects negatives, text and extra decimals", () => {
    expect(hourlyRateSchema.safeParse({ hourlyRate: "-1" }).success).toBe(false);
    expect(hourlyRateSchema.safeParse({ hourlyRate: "abc" }).success).toBe(false);
    expect(hourlyRateSchema.safeParse({ hourlyRate: "1.234" }).success).toBe(false);
  });
});

describe("jobBudgetSchema", () => {
  it("parses both fields independently", () => {
    expect(jobBudgetSchema.parse({ budgetHours: "40", budgetCost: "" })).toEqual({ budgetHours: 40, budgetCost: null });
  });
});

describe("publicHolidaySchema", () => {
  it("needs a real date and a name", () => {
    expect(publicHolidaySchema.safeParse({ date: "2026-02-30", name: "X" }).success).toBe(false);
    expect(publicHolidaySchema.safeParse({ date: "2026-08-31", name: " " }).success).toBe(false);
    expect(publicHolidaySchema.parse({ date: "2026-08-31", name: "Merdeka" }).name).toBe("Merdeka");
  });
});
