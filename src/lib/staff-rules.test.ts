import { describe, expect, it } from "vitest";
import { checkStaffChange } from "@/lib/staff-rules";

const admin = { id: "a1", role: "MASTER_ADMIN" as const, active: true };
const junior = { id: "j1", role: "JUNIOR" as const, active: true };

describe("checkStaffChange", () => {
  it("allows normal changes to other staff", () => {
    expect(
      checkStaffChange({ actorId: "a1", before: junior, after: { role: "SENIOR", active: true }, activeMasterAdminCount: 1 }),
    ).toBeNull();
    expect(
      checkStaffChange({ actorId: "a1", before: junior, after: { role: "JUNIOR", active: false }, activeMasterAdminCount: 1 }),
    ).toBeNull();
  });

  it("stops you deactivating yourself", () => {
    expect(
      checkStaffChange({ actorId: "a1", before: admin, after: { role: "MASTER_ADMIN", active: false }, activeMasterAdminCount: 3 }),
    ).toBe("You cannot deactivate your own account.");
  });

  it("stops you removing your own Master Admin role", () => {
    expect(
      checkStaffChange({ actorId: "a1", before: admin, after: { role: "PARTNER", active: true }, activeMasterAdminCount: 3 }),
    ).toBe("You cannot remove your own Master Admin role.");
  });

  it("stops removing the last active Master Admin", () => {
    const other = { ...admin, id: "a2" };
    expect(
      checkStaffChange({ actorId: "a1", before: other, after: { role: "MASTER_ADMIN", active: false }, activeMasterAdminCount: 1 }),
    ).toBe("There must always be at least one active Master Admin.");
    expect(
      checkStaffChange({ actorId: "a1", before: other, after: { role: "ADMIN", active: true }, activeMasterAdminCount: 1 }),
    ).toBe("There must always be at least one active Master Admin.");
  });

  it("allows removing a Master Admin when another active one remains", () => {
    const other = { ...admin, id: "a2" };
    expect(
      checkStaffChange({ actorId: "a1", before: other, after: { role: "ADMIN", active: true }, activeMasterAdminCount: 2 }),
    ).toBeNull();
  });

  it("allows changes to an inactive Master Admin", () => {
    const inactive = { ...admin, id: "a2", active: false };
    expect(
      checkStaffChange({ actorId: "a1", before: inactive, after: { role: "ADMIN", active: false }, activeMasterAdminCount: 1 }),
    ).toBeNull();
  });
});
