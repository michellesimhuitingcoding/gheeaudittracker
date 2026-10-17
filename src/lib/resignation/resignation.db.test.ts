import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { deactivateLeavers, setStaffLastDay } from "@/lib/resignation/service";

const tag = () => randomUUID().slice(0, 8);
let adminId: string;

async function staff(role: Role) {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `R-${id}`, name: "Resign Test", email: `r-${id}@example.com`, role, passwordHash: "x" },
  });
  return member.id;
}

// 10 Mar 2032, 09:00 in Malaysia.
const morning = new Date("2032-03-10T01:00:00Z");

beforeAll(async () => {
  adminId = await staff("ADMIN");
});

describe("resignation (database)", () => {
  it("records and clears a last day with an audit entry", async () => {
    const id = await staff("JUNIOR");
    expect(await setStaffLastDay(adminId, id, "2032-03-31", morning)).toEqual({ ok: true, message: "Last day recorded." });
    expect(await setStaffLastDay(adminId, id, "", morning)).toEqual({ ok: true, message: "Last day cleared." });
    const actions = await db.auditLog.findMany({ where: { entityId: id }, orderBy: { at: "asc" }, select: { action: true, changes: true } });
    expect(actions).toEqual([
      { action: "STAFF_LAST_DAY_SET", changes: { lastDay: { from: null, to: "2032-03-31" } } },
      { action: "STAFF_LAST_DAY_CLEARED", changes: { lastDay: { from: "2032-03-31", to: null } } },
    ]);
  });

  it("refuses a past last day", async () => {
    const id = await staff("JUNIOR");
    expect(await setStaffLastDay(adminId, id, "2032-03-09", morning)).toEqual({
      ok: false,
      fieldErrors: { lastDay: ["Last day cannot be in the past."] },
    });
  });

  it("deactivates staff the day after their last day and keeps their record", async () => {
    const leaving = await staff("SENIOR");
    const staying = await staff("SENIOR");
    await setStaffLastDay(adminId, leaving, "2032-03-10", morning);
    await setStaffLastDay(adminId, staying, "2032-03-11", morning);

    await deactivateLeavers(morning);
    expect((await db.staff.findUniqueOrThrow({ where: { id: leaving } })).active).toBe(true);

    await deactivateLeavers(new Date("2032-03-11T01:00:00Z"));
    expect((await db.staff.findUniqueOrThrow({ where: { id: leaving } })).active).toBe(false);
    expect((await db.staff.findUniqueOrThrow({ where: { id: staying } })).active).toBe(true);
    const logged = await db.auditLog.findFirstOrThrow({ where: { action: "STAFF_DEACTIVATED", entityId: leaving } });
    expect(logged).toMatchObject({ actorId: null, detail: "Last day 2032-03-10 passed" });
  });
});
