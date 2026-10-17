import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/permissions";
import { myProgress } from "@/lib/progress/service";

type Person = { id: string; role: Role };
const tag = () => randomUUID().slice(0, 8);
let manager: Person, otherManager: Person, partner: Person, senior: Person;
let staleJobId: string, freshJobId: string;

async function staff(role: Role, name: string): Promise<Person> {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `P-${id}`, name, email: `p-${id}@example.com`, role, passwordHash: "x" },
  });
  return { id: member.id, role };
}

async function client(name: string, ownerId: string, managerId: string | null) {
  return db.client.create({
    data: {
      name: `${name} ${tag()}`,
      entityType: "SDN_BHD",
      fyeDay: 31,
      fyeMonth: 12,
      ownerId,
      managerId,
      partnerId: partner.id,
      seniorId: senior.id,
      services: ["AUDIT"],
    },
  });
}

beforeAll(async () => {
  manager = await staff("MANAGER", "Progress Manager");
  otherManager = await staff("MANAGER", "Other Progress Manager");
  partner = await staff("PARTNER", "Progress Partner");
  senior = await staff("SENIOR", "Progress Senior");

  const managed = await client("Managed Co", partner.id, manager.id);
  const sourced = await client("Sourced Co", manager.id, otherManager.id);
  const other = await client("Other Co", partner.id, otherManager.id);

  const stale = await db.auditJob.create({
    data: { clientId: managed.id, year: 2025, stage: "IN_PROGRESS", createdById: senior.id, createdAt: new Date("2026-10-01T02:00:00Z") },
  });
  staleJobId = stale.id;
  const fresh = await db.auditJob.create({
    data: { clientId: sourced.id, year: 2025, stage: "MANAGER_REVIEW", createdById: senior.id, createdAt: new Date("2026-10-01T02:00:00Z") },
  });
  freshJobId = fresh.id;
  await db.auditJob.create({ data: { clientId: other.id, year: 2025, createdById: senior.id } });

  await db.auditStageChange.create({
    data: {
      jobId: fresh.id,
      fromStage: "IN_PROGRESS",
      toStage: "MANAGER_REVIEW",
      byId: senior.id,
      at: new Date("2026-10-17T01:00:00Z"),
      progressNote: "Fieldwork done",
      hours: 2,
      nextAction: "Review",
    },
  });
  await db.timesheetEntry.createMany({
    data: [
      { staffId: senior.id, jobId: stale.id, date: new Date("2026-10-01"), hours: 3.5, category: "WORK" },
      { staffId: senior.id, jobId: stale.id, date: new Date("2026-10-02"), hours: 1.25, category: "OT" },
    ],
  });
});

describe("my progress (database)", () => {
  it("lists jobs on clients the Manager manages or sourced, stalest first", async () => {
    const { jobs, summary } = await myProgress(manager, new Date("2026-10-17T03:00:00Z"));

    expect(jobs.map((job) => job.id)).toEqual([staleJobId, freshJobId]);
    expect(jobs[0]).toMatchObject({ days: 16, hours: 4.75, lastUpdatedBy: null });
    expect(jobs[1]).toMatchObject({ days: 0, hours: 0, lastUpdatedBy: "Progress Senior" });
    expect(summary).toMatchObject({ total: 2, waitingOnManager: 1, stale: 1 });
  });

  it("is for Managers only", async () => {
    await expect(myProgress(partner)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(myProgress(senior)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
