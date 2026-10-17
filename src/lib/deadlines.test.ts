import { describe, expect, it } from "vitest";
import { formCDueDate, formCDuesBetween, fyeDate, isoDate, nextFormCDue, todayDate, utcDate } from "@/lib/deadlines";

const due = (day: number, month: number, year: number) => isoDate(formCDueDate(day, month, year));

describe("Form C due date (FYE + 7 months)", () => {
  it("keeps month-end FYEs at month end", () => {
    expect(due(31, 12, 2025)).toBe("2026-07-31");
    expect(due(30, 6, 2025)).toBe("2026-01-31");
    expect(due(31, 7, 2025)).toBe("2026-02-28");
    expect(due(31, 7, 2027)).toBe("2028-02-29");
    expect(due(30, 4, 2026)).toBe("2026-11-30");
  });

  it("keeps the same day for mid-month FYEs", () => {
    expect(due(15, 3, 2026)).toBe("2026-10-15");
    expect(due(30, 7, 2025)).toBe("2026-02-28");
  });

  it("treats 29 Feb as 28 Feb in non-leap years", () => {
    expect(isoDate(fyeDate(29, 2, 2026))).toBe("2026-02-28");
    expect(due(29, 2, 2026)).toBe("2026-09-30");
    expect(due(29, 2, 2028)).toBe("2028-09-30");
  });
});

describe("nextFormCDue", () => {
  it("returns the first due date on or after today", () => {
    expect(isoDate(nextFormCDue(31, 12, utcDate(2026, 7, 31)))).toBe("2026-07-31");
    expect(isoDate(nextFormCDue(31, 12, utcDate(2026, 8, 1)))).toBe("2027-07-31");
    expect(isoDate(nextFormCDue(30, 6, utcDate(2026, 2, 1)))).toBe("2027-01-31");
  });
});

describe("formCDuesBetween", () => {
  it("finds due dates in a month window", () => {
    const july = formCDuesBetween(31, 12, utcDate(2026, 7, 1), utcDate(2026, 7, 31)).map(isoDate);
    expect(july).toEqual(["2026-07-31"]);
    expect(formCDuesBetween(31, 12, utcDate(2026, 8, 1), utcDate(2026, 8, 31))).toEqual([]);
  });
});

describe("todayDate", () => {
  it("uses Malaysia time (UTC+8)", () => {
    expect(isoDate(todayDate(new Date("2026-10-17T17:00:00Z")))).toBe("2026-10-18");
    expect(isoDate(todayDate(new Date("2026-10-17T15:00:00Z")))).toBe("2026-10-17");
  });
});
