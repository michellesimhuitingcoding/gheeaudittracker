import { describe, expect, it } from "vitest";
import { describeChanges, formatDateTime } from "@/lib/format";

describe("describeChanges", () => {
  it("describes from → to changes with readable labels", () => {
    expect(
      describeChanges({ role: { from: "JUNIOR", to: "SENIOR" }, active: { from: true, to: false } }),
    ).toEqual(["Role: Junior → Senior", "Status: Active → Inactive"]);
  });

  it("describes a created record snapshot", () => {
    expect(describeChanges({ role: "AUDIT_ADMIN_MANAGER", name: "Wong", staffId: "G002" })).toEqual([
      "Staff ID: G002",
      "Name: Wong",
      "Role: Audit Admin Manager",
    ]);
  });

  it("returns nothing for empty or invalid input", () => {
    expect(describeChanges(null)).toEqual([]);
    expect(describeChanges([1, 2])).toEqual([]);
  });
});

describe("formatDateTime", () => {
  it("shows Malaysia time (UTC+8)", () => {
    expect(formatDateTime(new Date("2026-10-17T16:30:00Z"))).toContain("18 Oct 2026");
  });
});
