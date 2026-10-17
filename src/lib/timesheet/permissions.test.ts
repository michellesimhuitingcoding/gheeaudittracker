import { describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { canUseTimesheet, timesheetCategories } from "@/lib/timesheet/permissions";

describe("timesheet permissions", () => {
  it("lets Junior, Senior and Manager log every category", () => {
    for (const role of ["JUNIOR", "SENIOR", "MANAGER"] as Role[]) {
      expect(timesheetCategories(role)).toEqual(["WORK", "OT", "TRAINING_CPD"]);
    }
  });

  it("lets Partners log overtime only", () => {
    expect(timesheetCategories("PARTNER")).toEqual(["OT"]);
  });

  it("gives Admin, Audit Admin and Secretarial roles no timesheet", () => {
    for (const role of [
      "ADMIN",
      "AUDIT_ADMIN_ASSISTANT",
      "AUDIT_ADMIN_MANAGER",
      "SECRETARIAL",
      "SECRETARIAL_ASSISTANT",
      "MASTER_ADMIN",
    ] as Role[]) {
      expect(canUseTimesheet(role)).toBe(false);
    }
  });
});
