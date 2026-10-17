import { describe, expect, it } from "vitest";
import {
  availableHours,
  leaveHoursOnWorkingDays,
  monthToDateInMyt,
  utilisationPercent,
  workingDays,
} from "@/lib/timecost/utilisation";

const day = (value: string) => new Date(`${value}T00:00:00Z`);

describe("monthToDateInMyt", () => {
  it("runs from the 1st to tomorrow in Malaysia", () => {
    // 2026-10-16 17:00 UTC is already 17 October in Malaysia.
    const period = monthToDateInMyt(new Date("2026-10-16T17:00:00Z"));
    expect(period.start).toEqual(day("2026-10-01"));
    expect(period.end).toEqual(day("2026-10-18"));
  });
});

describe("workingDays", () => {
  it("skips weekends", () => {
    // Monday 5 Oct to Monday 12 Oct 2026 (exclusive).
    expect(workingDays(day("2026-10-05"), day("2026-10-12"), new Set())).toBe(5);
  });

  it("skips public holidays", () => {
    expect(workingDays(day("2026-10-05"), day("2026-10-12"), new Set(["2026-10-07"]))).toBe(4);
  });

  it("ignores holidays on a weekend", () => {
    expect(workingDays(day("2026-10-05"), day("2026-10-12"), new Set(["2026-10-10"]))).toBe(5);
  });
});

describe("utilisation", () => {
  it("uses 8 hours per working day", () => {
    expect(availableHours(day("2026-10-05"), day("2026-10-12"), new Set())).toBe(40);
  });

  it("divides billable by available hours", () => {
    expect(utilisationPercent(30, 40)).toBe(75);
    expect(utilisationPercent(44, 40)).toBe(110);
  });

  it("is null with no available hours", () => {
    expect(utilisationPercent(4, 0)).toBeNull();
  });
});

describe("leaveHoursOnWorkingDays", () => {
  it("adds whole and part days on working days", () => {
    const leave = [
      { date: day("2026-10-05"), hours: 8 },
      { date: day("2026-10-06"), hours: 4 },
      { date: day("2026-10-08"), hours: 1.5 },
    ];
    expect(leaveHoursOnWorkingDays(leave, new Set())).toBe(13.5);
  });

  it("ignores leave on weekends and public holidays", () => {
    const leave = [
      { date: day("2026-10-07"), hours: 8 },
      { date: day("2026-10-10"), hours: 8 },
    ];
    expect(leaveHoursOnWorkingDays(leave, new Set(["2026-10-07"]))).toBe(0);
  });
});
