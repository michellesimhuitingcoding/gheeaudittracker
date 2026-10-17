import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { addTimesheetEntry, removeTimesheetEntry, updateTimesheetEntry } from "@/lib/timesheet/service";

type Person = { id: string; role: Role };
const tag = () => randomUUID().slice(0, 8);
let manager: Person, partner: Person, senior: Person, outsider: Person, admin: Person;
let jobId: string;

async function staff(role: Role, name: string): Promise<Person> {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `T-${id}`, name, email: `t-${id}@example.com`, role, passwordHash: "x" },
  });
  return { id: member.id, role };
}

const entry = (extra: Record<string, unknown> = {}) => ({
  date: "2026-01-05",
  category: "WORK",
  jobId,
  hours: "8",
  note: "Fieldwork",
  ...extra,
});

beforeAll(async () => {
  manager = await staff("MANAGER", "Time Manager");
  partner = await staff("PARTNER", "Time Partner");
  senior = await staff("SENIOR", "Time Senior");
  outsider = await staff("SENIOR", "Unassigned Time Senior");
  admin = await staff("ADMIN", "Time Admin");
  const client = await db.client.create({
    data: {
      name: `Time Co ${tag()}`,
      entityType: "SDN_BHD",
      fyeDay: 31,
      fyeMonth: 12,
      ownerId: manager.id,
      managerId: manager.id,
      partnerId: partner.id,
      seniorId: senior.id,
      services: ["AUDIT"],
    },
  });
  const job = await db.auditJob.create({ data: { clientId: client.id, year: 2025, createdById: manager.id } });
  jobId = job.id;
});

describe("timesheet (database)", () => {
  it("logs time for the right people on jobs they can see", async () => {
    expect(await addTimesheetEntry(senior, entry())).toMatchObject({ ok: true });
    expect(await addTimesheetEntry(outsider, entry())).toMatchObject({
      ok: false,
      fieldErrors: { jobId: ["You cannot log time to this job."] },
    });
    expect(await addTimesheetEntry(admin, entry())).toEqual({ ok: false, error: "Your role does not keep a timesheet." });
    expect(await addTimesheetEntry(partner, entry())).toMatchObject({
      ok: false,
      fieldErrors: { category: ["You cannot log Work time."] },
    });
    expect(await addTimesheetEntry(partner, entry({ category: "OT" }))).toMatchObject({ ok: true });

    const logged = await db.auditLog.findFirstOrThrow({
      where: { action: "TIMESHEET_ENTRY_ADDED", actorId: senior.id },
    });
    expect(logged.changes).toMatchObject({ date: "2026-01-05", category: "Work", hours: 8 });
  });

  it("caps a day at 24 hours", async () => {
    const date = "2026-01-06";
    expect(await addTimesheetEntry(manager, entry({ date, hours: "20" }))).toMatchObject({ ok: true });
    expect(await addTimesheetEntry(manager, entry({ date, hours: "4.5" }))).toMatchObject({
      ok: false,
      fieldErrors: { hours: ["Only 4 more hours can be logged on this day."] },
    });
    expect(await addTimesheetEntry(manager, entry({ date, category: "TRAINING_CPD", hours: "4" }))).toMatchObject({
      ok: true,
    });
  });

  it("lets staff change and remove only their own entries", async () => {
    await addTimesheetEntry(senior, entry({ date: "2026-01-07", hours: "3" }));
    const own = await db.timesheetEntry.findFirstOrThrow({ where: { staffId: senior.id, date: new Date("2026-01-07") } });

    expect(await updateTimesheetEntry(manager, own.id, entry({ date: "2026-01-07" }))).toMatchObject({ ok: false });
    expect(await updateTimesheetEntry(senior, own.id, entry({ date: "2026-01-07", hours: "5" }))).toMatchObject({
      ok: true,
    });
    expect((await db.timesheetEntry.findUniqueOrThrow({ where: { id: own.id } })).hours.toString()).toBe("5");
    const updated = await db.auditLog.findFirstOrThrow({ where: { action: "TIMESHEET_ENTRY_UPDATED", entityId: own.id } });
    expect(updated.changes).toEqual({ hours: { from: 3, to: 5 } });

    expect(await removeTimesheetEntry(manager, own.id)).toMatchObject({ ok: false });
    expect(await removeTimesheetEntry(senior, own.id)).toMatchObject({ ok: true });
    expect(await db.timesheetEntry.findUnique({ where: { id: own.id } })).toBeNull();
    expect(
      await db.auditLog.findFirst({ where: { action: "TIMESHEET_ENTRY_REMOVED", entityId: own.id } }),
    ).not.toBeNull();
  });
});
