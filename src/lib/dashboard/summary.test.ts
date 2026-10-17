import { describe, expect, it } from "vitest";
import { type Deadline, isOverBudget, splitDeadlines, teamTotals } from "@/lib/dashboard/summary";
import { compareToBudget } from "@/lib/timecost/timecost";

const deadline = (iso: string, label: string): Deadline => ({
  date: new Date(`${iso}T00:00:00Z`),
  kind: "FORM_C",
  label,
  href: "/",
});

describe("splitDeadlines", () => {
  const today = new Date("2026-10-17T00:00:00Z");

  it("splits overdue from due within 7 days, earliest first, and drops later ones", () => {
    const { overdue, dueSoon } = splitDeadlines(
      [
        deadline("2026-10-24", "Last due day"),
        deadline("2026-10-25", "Too late"),
        deadline("2026-10-16", "Yesterday"),
        deadline("2026-10-17", "Today"),
        deadline("2026-09-01", "Long ago"),
      ],
      today,
    );
    expect(overdue.map((row) => row.label)).toEqual(["Long ago", "Yesterday"]);
    expect(dueSoon.map((row) => row.label)).toEqual(["Today", "Last due day"]);
  });

  it("handles no deadlines", () => {
    expect(splitDeadlines([], today)).toEqual({ overdue: [], dueSoon: [] });
  });
});

describe("teamTotals", () => {
  it("adds hours and pools utilisation", () => {
    const totals = teamTotals([
      { hoursThisWeek: 10.5, utilisation: { billableHours: 60, availableHours: 80, percent: 75 } },
      { hoursThisWeek: 0.25, utilisation: { billableHours: 20, availableHours: 40, percent: 50 } },
    ]);
    expect(totals).toEqual({
      people: 2,
      hoursThisWeek: 10.75,
      utilisation: { billableHours: 80, availableHours: 120, percent: 67 },
    });
  });

  it("has no utilisation without a team", () => {
    expect(teamTotals([]).utilisation.percent).toBeNull();
  });
});

describe("isOverBudget", () => {
  const actual = { hours: 10, cost: 1000, unratedHours: 0 };

  it("is over when hours or cost exceed the budget", () => {
    expect(isOverBudget(compareToBudget(actual, { hours: 9.5, cost: 2000 }))).toBe(true);
    expect(isOverBudget(compareToBudget(actual, { hours: 20, cost: 999 }))).toBe(true);
  });

  it("is not over when on budget or no budget is set", () => {
    expect(isOverBudget(compareToBudget(actual, { hours: 10, cost: 1000 }))).toBe(false);
    expect(isOverBudget(compareToBudget(actual, { hours: null, cost: null }))).toBe(false);
  });
});
