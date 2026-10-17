import { describe, expect, it } from "vitest";
import { leaveDates, leaveLabel } from "@/lib/leave/leave";
import { canManageLeave } from "@/lib/leave/permissions";
import { leaveSchema } from "@/lib/leave/schema";

const day = (value: string) => new Date(`${value}T00:00:00Z`);
const iso = (dates: Date[]) => dates.map((date) => date.toISOString().slice(0, 10));

describe("leaveDates", () => {
  it("covers working days only, both ends included", () => {
    // Friday 16 Oct to Tuesday 20 Oct 2026, with Monday a public holiday.
    expect(iso(leaveDates(day("2026-10-16"), day("2026-10-20"), new Set(["2026-10-19"])))).toEqual([
      "2026-10-16",
      "2026-10-20",
    ]);
  });

  it("is empty for a weekend", () => {
    expect(leaveDates(day("2026-10-17"), day("2026-10-18"), new Set())).toEqual([]);
  });
});

describe("leaveLabel", () => {
  it("shows hours for part days only", () => {
    expect(leaveLabel(8)).toBe("On leave");
    expect(leaveLabel(4)).toBe("On leave 4h");
    expect(leaveLabel(1.5)).toBe("On leave 1.5h");
  });
});

describe("canManageLeave", () => {
  it("lets staff change their own leave and Admin or Master Admin anyone's", () => {
    expect(canManageLeave({ id: "a", role: "JUNIOR" }, "a")).toBe(true);
    expect(canManageLeave({ id: "a", role: "MANAGER" }, "b")).toBe(false);
    expect(canManageLeave({ id: "a", role: "PARTNER" }, "b")).toBe(false);
    expect(canManageLeave({ id: "a", role: "ADMIN" }, "b")).toBe(true);
    expect(canManageLeave({ id: "a", role: "MASTER_ADMIN" }, "b")).toBe(true);
  });
});

describe("leaveSchema", () => {
  const base = { staffId: "s1", from: "2026-10-20" };

  it("books a single whole day when the end date is blank", () => {
    expect(leaveSchema.parse({ ...base, to: "", length: "FULL" })).toEqual({
      staffId: "s1",
      from: day("2026-10-20"),
      to: day("2026-10-20"),
      hours: 8,
      note: null,
    });
  });

  it("books a range of whole days", () => {
    expect(leaveSchema.parse({ ...base, to: "2026-10-23", length: "FULL", note: " Holiday " })).toMatchObject({
      to: day("2026-10-23"),
      hours: 8,
      note: "Holiday",
    });
  });

  it("books part-day hours in half-hour steps", () => {
    expect(leaveSchema.parse({ ...base, length: "PART", hours: "4" })).toMatchObject({ hours: 4 });
    expect(leaveSchema.parse({ ...base, length: "PART", hours: "1.5" })).toMatchObject({ hours: 1.5 });
  });

  it("rejects bad part-day hours", () => {
    for (const hours of ["", "0", "-1", "1.25", "8", "9"]) {
      expect(leaveSchema.safeParse({ ...base, length: "PART", hours }).success).toBe(false);
    }
  });

  it("keeps part-day leave to one date", () => {
    expect(leaveSchema.safeParse({ ...base, to: "2026-10-21", length: "PART", hours: "4" }).success).toBe(false);
  });

  it("rejects bad ranges", () => {
    expect(leaveSchema.safeParse({ ...base, from: "2026-02-30", length: "FULL" }).success).toBe(false);
    expect(leaveSchema.safeParse({ ...base, to: "2026-10-19", length: "FULL" }).success).toBe(false);
    expect(leaveSchema.safeParse({ ...base, to: "2026-12-18", length: "FULL" }).success).toBe(true);
    expect(leaveSchema.safeParse({ ...base, to: "2026-12-19", length: "FULL" }).success).toBe(false);
    expect(leaveSchema.safeParse({ ...base, length: "HALF" }).success).toBe(false);
  });
});
