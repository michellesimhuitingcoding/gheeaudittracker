import { describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import {
  canChangeOwner,
  canChangePaymentStatus,
  canCreateClient,
  canEditClient,
  canViewClient,
  clientListFilter,
} from "@/lib/clients/permissions";

const as = (role: Role, id = "me") => ({ id, role });
const client = { ownerId: "owner", managerId: "mgr", partnerId: "ptr" };

describe("client permissions", () => {
  it("lets intake roles add clients", () => {
    for (const role of ["AUDIT_ADMIN_ASSISTANT", "AUDIT_ADMIN_MANAGER", "ADMIN", "MASTER_ADMIN"] as Role[]) {
      expect(canCreateClient(as(role))).toBe(true);
    }
    for (const role of ["JUNIOR", "SENIOR", "MANAGER", "PARTNER", "SECRETARIAL"] as Role[]) {
      expect(canCreateClient(as(role))).toBe(false);
    }
  });

  it("lets intake roles and the client's own Manager and Partner edit", () => {
    expect(canEditClient(as("AUDIT_ADMIN_ASSISTANT"), client)).toBe(true);
    expect(canEditClient(as("MANAGER", "mgr"), client)).toBe(true);
    expect(canEditClient(as("PARTNER", "ptr"), client)).toBe(true);
    expect(canEditClient(as("MANAGER", "other"), client)).toBe(false);
    expect(canEditClient(as("PARTNER", "other"), client)).toBe(false);
    expect(canEditClient(as("JUNIOR", "mgr"), { ...client, managerId: "x" })).toBe(false);
  });

  it("limits Managers to their own clients", () => {
    expect(canViewClient(as("MANAGER", "mgr"), client)).toBe(true);
    expect(canViewClient(as("MANAGER", "owner"), client)).toBe(true);
    expect(canViewClient(as("MANAGER", "other"), client)).toBe(false);
    expect(clientListFilter(as("MANAGER", "mgr"))).toEqual({ OR: [{ managerId: "mgr" }, { ownerId: "mgr" }] });
  });

  it("lets Partners, Secretarial and intake roles see all clients", () => {
    for (const role of ["PARTNER", "SECRETARIAL", "SECRETARIAL_ASSISTANT", "ADMIN"] as Role[]) {
      expect(canViewClient(as(role, "other"), client)).toBe(true);
      expect(clientListFilter(as(role))).toEqual({});
    }
  });

  it("does not yet give Junior and Senior the client list", () => {
    expect(clientListFilter(as("JUNIOR"))).toBeNull();
    expect(canViewClient(as("SENIOR"), client)).toBe(false);
  });

  it("keeps owner and payment status changes to Admin and Master Admin", () => {
    expect(canChangeOwner(as("ADMIN"))).toBe(true);
    expect(canChangeOwner(as("AUDIT_ADMIN_MANAGER"))).toBe(false);
    expect(canChangePaymentStatus(as("MASTER_ADMIN"))).toBe(true);
    expect(canChangePaymentStatus(as("PARTNER"))).toBe(false);
  });
});
