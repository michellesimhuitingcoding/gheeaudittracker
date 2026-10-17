import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { addLeave, removeLeave } from "@/lib/leave/service";
import { monthToDateUtilisation } from "@/lib/timecost/service";

type Person = { id: string; role: Role };
const tag = () => randomUUID().slice(0, 8);
let junior: Person, manager: Person, admin: Person;

async function staff(role: Role, name: string): Promise<Person> {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `L-${id}`, name, email: `l-${id}@example.com`, role, passwordHash: "x" },
  });
  return { id: member.id, role };
}

beforeAll(async () => {
  junior = await staff("JUNIOR", "Leave Junior");
  manager = await staff("MANAGER", "Leave Manager");
  admin = await staff("ADMIN", "Leave Admin");
});

describe("leave (database)", () => {
  it("records whole days on working days only and logs it", async () => {
    // Friday 2 Jan 2032 to Tuesday 6 Jan 2032 covers a weekend.
    expect(await addLeave(junior, { staffId: junior.id, from: "2032-01-02", to: "2032-01-06", length: "FULL" })).toEqual(
      { ok: true, message: "Leave recorded for 3 working days." },
    );
    const rows = await db.leaveEntry.findMany({ where: { staffId: junior.id }, orderBy: { date: "asc" } });
    expect(rows.map((row) => [row.date.toISOString().slice(0, 10), Number(row.hours)])).toEqual([
      ["2032-01-02", 8],
      ["2032-01-05", 8],
      ["2032-01-06", 8],
    ]);
    const logged = await db.auditLog.findFirstOrThrow({ where: { action: "LEAVE_ADDED", entityId: junior.id } });
    expect(logged.changes).toMatchObject({ date: "2032-01-02 to 2032-01-06", days: 3, hours: 8 });
  });

  it("refuses leave that overlaps existing leave", async () => {
    const result = await addLeave(junior, { staffId: junior.id, from: "2032-01-06", length: "PART", hours: "2" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { from: [expect.stringContaining("already recorded")] } });
  });

  it("lets Admin record leave for others but not a Manager", async () => {
    const input = { staffId: junior.id, from: "2032-01-07", length: "PART", hours: "4" };
    expect(await addLeave(manager, input)).toEqual({ ok: false, error: "You can only change your own leave." });
    expect(await addLeave(admin, input)).toMatchObject({ ok: true });
    const entry = await db.leaveEntry.findFirstOrThrow({ where: { staffId: junior.id, date: new Date("2032-01-07") } });
    expect(entry.createdById).toBe(admin.id);

    expect(await removeLeave(manager, entry.id)).toEqual({ ok: false, error: "You can only change your own leave." });
    expect(await removeLeave(junior, entry.id)).toEqual({ ok: true, message: "Leave removed." });
    expect(await db.auditLog.count({ where: { action: "LEAVE_REMOVED", entityId: junior.id } })).toBe(1);
  });

  it("takes leave off available hours for utilisation", async () => {
    await addLeave(manager, { staffId: manager.id, from: "2032-03-02", length: "PART", hours: "4" });
    // Monday 1 to Tuesday 2 March 2032 in Malaysia: 16 working hours less 4 hours of leave.
    const now = new Date("2032-03-02T04:00:00Z");
    const rows = await monthToDateUtilisation([manager.id, junior.id], now);
    expect(rows.get(manager.id)!.availableHours).toBe(12);
    expect(rows.get(junior.id)!.availableHours).toBe(16);
  });
});
