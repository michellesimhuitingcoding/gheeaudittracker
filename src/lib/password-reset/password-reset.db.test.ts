import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { resetStaffPassword } from "@/lib/staff-service";
import { RESET_REQUESTED_MESSAGE } from "./schema";
import { changeOwnPassword, openResetRequestCount, openResetRequests, requestPasswordReset } from "./service";

const OLD_PASSWORD = "old password 123";
const TEMP_PASSWORD = "temporary pass 1";
const NEW_PASSWORD = "new password 456";
const generic = { ok: true, message: RESET_REQUESTED_MESSAGE };
let masterAdminId: string;

async function staff(role: Role = "JUNIOR", active = true) {
  const id = randomUUID().slice(0, 8);
  return db.staff.create({
    data: {
      staffId: `PR-${id}`,
      name: `Reset ${id}`,
      email: `pr-${id}@example.com`,
      role,
      active,
      passwordHash: await hashPassword(OLD_PASSWORD),
    },
  });
}

const openFor = (staffId: string) => db.passwordResetRequest.count({ where: { staffId, resolvedAt: null } });

beforeAll(async () => {
  masterAdminId = (await staff("MASTER_ADMIN")).id;
});

describe("password reset requests (database)", () => {
  it("records one open request per person and logs it", async () => {
    const member = await staff();
    expect(await requestPasswordReset(member.email.toUpperCase())).toEqual(generic);
    expect(await requestPasswordReset(member.email)).toEqual(generic);
    expect(await openFor(member.id)).toBe(1);
    expect(await db.auditLog.count({ where: { action: "PASSWORD_RESET_REQUESTED", entityId: member.id } })).toBe(1);
  });

  it("gives the same message and records nothing for unknown or inactive accounts", async () => {
    const inactive = await staff("JUNIOR", false);
    expect(await requestPasswordReset("nobody-here@example.com")).toEqual(generic);
    expect(await requestPasswordReset(inactive.email)).toEqual(generic);
    expect(await openFor(inactive.id)).toBe(0);
  });

  it("asks for a valid email", async () => {
    expect(await requestPasswordReset("not-an-email")).toEqual({
      ok: false,
      fieldErrors: { email: ["Enter a valid email address."] },
    });
  });

  it("shows open requests to the Master Admin only", async () => {
    const member = await staff();
    await requestPasswordReset(member.email);
    expect(await openResetRequestCount("MASTER_ADMIN")).toBeGreaterThan(0);
    expect((await openResetRequests("MASTER_ADMIN")).map((request) => request.staff.id)).toContain(member.id);
    expect(await openResetRequestCount("ADMIN")).toBe(0);
    expect(await openResetRequests("MANAGER")).toEqual([]);
  });

  it("closes the request when the Master Admin sets a temporary password", async () => {
    const member = await staff();
    await requestPasswordReset(member.email);
    expect(await resetStaffPassword(masterAdminId, member.id, TEMP_PASSWORD)).toMatchObject({ ok: true });

    const request = await db.passwordResetRequest.findFirstOrThrow({ where: { staffId: member.id } });
    expect(request).toMatchObject({ resolvedById: masterAdminId });
    expect(request.resolvedAt).not.toBeNull();
    const updated = await db.staff.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.mustChangePassword).toBe(true);
    expect(await verifyPassword(TEMP_PASSWORD, updated.passwordHash)).toBe(true);
  });

  it("lets staff replace a temporary password with their own and logs it", async () => {
    const member = await staff();
    await resetStaffPassword(masterAdminId, member.id, TEMP_PASSWORD);
    const input = { currentPassword: TEMP_PASSWORD, password: NEW_PASSWORD, confirm: NEW_PASSWORD };
    expect(await changeOwnPassword(member.id, input)).toEqual({ ok: true, message: "Password changed." });

    const updated = await db.staff.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.mustChangePassword).toBe(false);
    expect(await verifyPassword(NEW_PASSWORD, updated.passwordHash)).toBe(true);
    const logged = await db.auditLog.findFirstOrThrow({ where: { action: "STAFF_PASSWORD_CHANGED", entityId: member.id } });
    expect(logged).toMatchObject({ actorId: member.id, changes: null });
  });

  it("refuses a wrong current password or the same password", async () => {
    const member = await staff();
    expect(
      await changeOwnPassword(member.id, { currentPassword: "wrong password", password: NEW_PASSWORD, confirm: NEW_PASSWORD }),
    ).toEqual({ ok: false, fieldErrors: { currentPassword: ["Current password is incorrect."] } });
    expect(
      await changeOwnPassword(member.id, { currentPassword: OLD_PASSWORD, password: OLD_PASSWORD, confirm: OLD_PASSWORD }),
    ).toEqual({ ok: false, fieldErrors: { password: ["Choose a password different from your current one."] } });
    const unchanged = await db.staff.findUniqueOrThrow({ where: { id: member.id } });
    expect(await verifyPassword(OLD_PASSWORD, unchanged.passwordHash)).toBe(true);
  });
});
