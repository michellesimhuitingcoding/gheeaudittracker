import { describe, expect, it } from "vitest";
import { eventsByDay, monthGrid, monthParam, parseMonth, shiftMonth } from "@/lib/calendar";
import { isoDate, utcDate } from "@/lib/deadlines";

describe("calendar months", () => {
  it("parses ?month and falls back to today's month", () => {
    const today = utcDate(2026, 10, 17);
    expect(parseMonth("2026-07", today)).toEqual({ year: 2026, month: 7 });
    expect(parseMonth("2026-13", today)).toEqual({ year: 2026, month: 10 });
    expect(parseMonth(undefined, today)).toEqual({ year: 2026, month: 10 });
  });

  it("moves between months across years", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(monthParam({ year: 2026, month: 7 })).toBe("2026-07");
  });

  it("builds Monday-first weeks covering the month", () => {
    const weeks = monthGrid({ year: 2026, month: 10 });
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(isoDate(weeks[0][0])).toBe("2026-09-28");
    expect(isoDate(weeks.at(-1)!.at(-1)!)).toBe("2026-11-01");
    expect(weeks.flat().map(isoDate)).toContain("2026-10-31");
  });

  it("handles a month starting on Monday", () => {
    const weeks = monthGrid({ year: 2026, month: 6 });
    expect(isoDate(weeks[0][0])).toBe("2026-06-01");
    expect(isoDate(weeks.at(-1)!.at(-1)!)).toBe("2026-07-05");
  });
});

describe("eventsByDay", () => {
  it("groups by day with Form C before pre-audit", () => {
    const day = utcDate(2026, 7, 31);
    const grouped = eventsByDay([
      { date: day, kind: "PRE_AUDIT", label: "B", href: "/b" },
      { date: day, kind: "FORM_C", label: "A", href: "/a" },
    ]);
    expect(grouped.get("2026-07-31")?.map((event) => event.kind)).toEqual(["FORM_C", "PRE_AUDIT"]);
  });
});
