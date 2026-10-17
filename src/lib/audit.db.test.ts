import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createStaff, resetStaffPassword, setStaffActive, updateStaff } from "@/lib/staff-service";

let adminId: string;

function unique(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

async function entriesFor(entityId: string) {
  return db.auditLog.findMany({ where: { entityId }, orderBy: { at: "asc" } });
}

async function newStaff(role = "JUNIOR") {
  const staffId = unique("T");
  const result = await createStaff(adminId, {
    staffId,
    name: "Test Person",
    email: `${staffId.toLowerCase()}@example.com`,
    role,
    password: "a-long-password",
  });
  expect(result).toMatchObject({ ok: true });
  return db.staff.findUniqueOrThrow({ where: { staffId } });
}

beforeAll(async () => {
  const staffId = unique("ADMIN");
  const admin = await db.staff.create({
    data: {
      staffId,
      name: "Audit Admin",
      email: `${staffId.toLowerCase()}@example.com`,
      role: "MASTER_ADMIN",
      passwordHash: "not-used",
    },
  });
  adminId = admin.id;
});

describe("audit trail (database)", () => {
  it("records who added a staff member, without the password", async () => {
    const staff = await newStaff();
    const [entry, ...rest] = await entriesFor(staff.id);
    expect(rest).toHaveLength(0);
    expect(entry).toMatchObject({ action: "STAFF_CREATED", actorId: adminId, entityType: "Staff" });
    expect(entry.changes).toMatchObject({ staffId: staff.staffId, role: "JUNIOR" });
    expect(JSON.stringify(entry)).not.toMatch(/password/i);
  });

  it("records only the fields that changed, from → to", async () => {
    const staff = await newStaff();
    await updateStaff(adminId, staff.id, {
      staffId: staff.staffId,
      name: staff.name,
      email: staff.email,
      role: "SENIOR",
    });
    const entries = await entriesFor(staff.id);
    expect(entries.at(-1)).toMatchObject({
      action: "STAFF_UPDATED",
      actorId: adminId,
      changes: { role: { from: "JUNIOR", to: "SENIOR" } },
    });
  });

  it("writes nothing when a save changes nothing", async () => {
    const staff = await newStaff();
    await updateStaff(adminId, staff.id, {
      staffId: staff.staffId,
      name: staff.name,
      email: staff.email,
      role: staff.role,
    });
    expect(await entriesFor(staff.id)).toHaveLength(1);
  });

  it("records deactivation and reactivation", async () => {
    const staff = await newStaff();
    await setStaffActive(adminId, staff.id, false);
    await setStaffActive(adminId, staff.id, true);
    const actions = (await entriesFor(staff.id)).map((entry) => entry.action);
    expect(actions).toEqual(["STAFF_CREATED", "STAFF_DEACTIVATED", "STAFF_REACTIVATED"]);
  });

  it("records a password reset without storing the password", async () => {
    const staff = await newStaff();
    await resetStaffPassword(adminId, staff.id, "another-long-password");
    const entry = (await entriesFor(staff.id)).at(-1)!;
    expect(entry).toMatchObject({ action: "STAFF_PASSWORD_RESET", actorId: adminId, changes: null });
    expect(JSON.stringify(entry)).not.toContain("another-long-password");
  });

  it("writes nothing when a safety rule blocks the change", async () => {
    const before = await db.auditLog.count({ where: { entityId: adminId } });
    const result = await setStaffActive(adminId, adminId, false);
    expect(result).toMatchObject({ ok: false });
    expect(await db.auditLog.count({ where: { entityId: adminId } })).toBe(before);
  });

  it("writes nothing when the change itself fails", async () => {
    const existing = await newStaff();
    const before = await db.auditLog.count();
    const result = await createStaff(adminId, {
      staffId: unique("T"),
      name: "Duplicate",
      email: existing.email,
      role: "JUNIOR",
      password: "a-long-password",
    });
    expect(result).toMatchObject({ ok: false, fieldErrors: { email: ["This email is already used."] } });
    expect(await db.auditLog.count()).toBe(before);
  });

  it("refuses to edit, delete or wipe audit entries", async () => {
    const staff = await newStaff();
    const [entry] = await entriesFor(staff.id);
    await expect(db.auditLog.update({ where: { id: entry.id }, data: { action: "X" } })).rejects.toThrow(
      /append-only/,
    );
    await expect(db.auditLog.delete({ where: { id: entry.id } })).rejects.toThrow(/append-only/);
    await expect(db.$executeRawUnsafe('TRUNCATE "AuditLog"')).rejects.toThrow(/append-only/);
    expect(await entriesFor(staff.id)).toHaveLength(1);
  });
});
