import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { checkIn } from "@/lib/checkin/service";
import { db } from "@/lib/db";
import { createAuditJob, moveAuditStage } from "@/lib/jobs/service";
import { markFyiRead, openCounts, openNotifications, raiseNoUpdateAlerts } from "@/lib/notifications/service";

type Person = { id: string; role: Role };
const tag = () => randomUUID().slice(0, 8);
let manager: Person, partner: Person, senior: Person, junior: Person;
let clientId: string;

async function staff(role: Role, name: string): Promise<Person> {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `N-${id}`, name, email: `n-${id}@example.com`, role, passwordHash: "x" },
  });
  return { id: member.id, role };
}

const move = (actor: Person, jobId: string, fromStage: string, extra: Record<string, unknown> = {}) =>
  moveAuditStage(actor, jobId, { fromStage, progressNote: "Done", hours: "1", nextAction: "Next", ...extra });

const open = (person: Person, kind: string) =>
  db.notification.count({ where: { recipientId: person.id, kind: kind as never, closedAt: null, clientId } });

beforeAll(async () => {
  manager = await staff("MANAGER", "Bell Manager");
  partner = await staff("PARTNER", "Bell Partner");
  senior = await staff("SENIOR", "Bell Senior");
  junior = await staff("JUNIOR", "Bell Junior");
  const client = await db.client.create({
    data: {
      name: `Miri ${tag()}`,
      entityType: "SDN_BHD",
      fyeDay: 31,
      fyeMonth: 12,
      ownerId: manager.id,
      managerId: manager.id,
      partnerId: partner.id,
      seniorId: senior.id,
      services: ["AUDIT"],
      assignedStaff: { create: { staffId: junior.id } },
    },
  });
  clientId = client.id;
});

describe("notifications (database)", () => {
  it("gives the action only to whoever's turn it is and closes the old one", async () => {
    expect(await createAuditJob(manager, clientId, { year: 2025 })).toMatchObject({ ok: true });
    const job = await db.auditJob.findFirstOrThrow({ where: { clientId, year: 2025 } });
    expect(await open(senior, "YOUR_TURN")).toBe(1);
    expect(await open(junior, "YOUR_TURN")).toBe(0);

    let stage = "";
    for (const next of ["DOCUMENTS_RECEIVED", "PRE_AUDIT", "READY", "IN_PROGRESS"]) {
      expect(await move(senior, job.id, stage)).toMatchObject({ ok: true });
      stage = next;
    }
    expect(await move(senior, job.id, "IN_PROGRESS")).toMatchObject({ ok: true });

    expect(await open(senior, "YOUR_TURN")).toBe(0);
    expect(await open(manager, "YOUR_TURN")).toBe(1);
    expect(await open(partner, "YOUR_TURN")).toBe(0);
    expect(await open(manager, "STAGE_CHANGED")).toBe(4);

    expect(await move(manager, job.id, "MANAGER_REVIEW", { reviewNote: "OK" })).toMatchObject({ ok: true });
    expect(await open(manager, "YOUR_TURN")).toBe(0);
    expect(await open(partner, "YOUR_TURN")).toBe(1);
  });

  it("groups by client and marks FYI read", async () => {
    const groups = await openNotifications(manager.id, "FYI");
    const group = groups.find((row) => row.clientId === clientId);
    expect(group?.items.length).toBe(4);

    await markFyiRead(manager.id, clientId);
    expect(await open(manager, "STAGE_CHANGED")).toBe(0);
    expect((await openCounts(manager.id)).FYI).toBe(0);
  });

  it("raises one no-update alert per level and clears it on check-in", async () => {
    const job = await db.auditJob.create({
      data: { clientId, year: 2024, createdById: manager.id, createdAt: new Date("2026-01-01T02:00:00Z") },
    });
    const now = new Date("2026-01-25T02:00:00Z");
    await raiseNoUpdateAlerts(now);
    await raiseNoUpdateAlerts(now);
    expect(await db.notification.count({ where: { jobId: job.id, kind: "NO_UPDATE_MANAGER", closedAt: null } })).toBe(1);
    expect(await db.notification.count({ where: { jobId: job.id, kind: "NO_UPDATE_PARTNER", closedAt: null } })).toBe(1);
    expect(
      await db.notification.count({ where: { jobId: job.id, recipientId: partner.id, kind: "NO_UPDATE_PARTNER" } }),
    ).toBe(1);

    expect(await checkIn(senior, job.id)).toMatchObject({ ok: true });
    expect(await db.notification.count({ where: { jobId: job.id, closedAt: null } })).toBe(0);
  });
});
