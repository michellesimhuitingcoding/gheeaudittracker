import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/permissions";
import { teamOverview } from "@/lib/team/service";

type Person = { id: string; role: Role };
const tag = () => randomUUID().slice(0, 8);
const NOW = new Date("2026-10-17T03:00:00Z");
let manager: Person, otherManager: Person, partner: Person;
let senior: Person, junior: Person, otherSenior: Person, leaver: Person;
let managedId: string, sourcedId: string;

async function staff(role: Role, name: string, active = true): Promise<Person> {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `T-${id}`, name: `${name} ${id}`, email: `t-${id}@example.com`, role, passwordHash: "x", active },
  });
  return { id: member.id, role };
}

async function client(name: string, ownerId: string, managerId: string, seniorId: string, assigned: string[]) {
  return db.client.create({
    data: {
      name: `${name} ${tag()}`,
      entityType: "SDN_BHD",
      fyeDay: 31,
      fyeMonth: 12,
      ownerId,
      managerId,
      partnerId: partner.id,
      seniorId,
      services: ["AUDIT"],
      assignedStaff: { create: assigned.map((staffId) => ({ staffId })) },
    },
  });
}

beforeAll(async () => {
  manager = await staff("MANAGER", "Team Manager");
  otherManager = await staff("MANAGER", "Other Team Manager");
  partner = await staff("PARTNER", "Team Partner");
  senior = await staff("SENIOR", "Team Senior");
  junior = await staff("JUNIOR", "Team Junior");
  otherSenior = await staff("SENIOR", "Other Senior");
  leaver = await staff("JUNIOR", "Leaver", false);

  // Managed by the Manager; the senior is also on assigned staff.
  const managed = await client("Managed Co", partner.id, manager.id, senior.id, [senior.id, junior.id, leaver.id, partner.id]);
  managedId = managed.id;
  // Sourced by the Manager, managed by someone else.
  const sourced = await client("Sourced Co", manager.id, otherManager.id, senior.id, []);
  sourcedId = sourced.id;
  // Not the Manager's client at all.
  const other = await client("Other Co", partner.id, otherManager.id, otherSenior.id, [junior.id]);

  const job = await db.auditJob.create({ data: { clientId: managed.id, year: 2025, stage: "IN_PROGRESS", createdById: senior.id } });
  await db.auditJob.create({ data: { clientId: sourced.id, year: 2025, createdById: senior.id } });
  const otherJob = await db.auditJob.create({ data: { clientId: other.id, year: 2025, createdById: otherSenior.id } });

  await db.timesheetEntry.createMany({
    data: [
      { staffId: senior.id, jobId: job.id, date: new Date("2026-10-12"), hours: 3.5, category: "WORK" },
      { staffId: senior.id, jobId: job.id, date: new Date("2026-10-16"), hours: 1.25, category: "OT" },
      // Last week — not counted.
      { staffId: senior.id, jobId: job.id, date: new Date("2026-10-11"), hours: 8, category: "WORK" },
      // Another Manager's client — not counted.
      { staffId: junior.id, jobId: otherJob.id, date: new Date("2026-10-13"), hours: 6, category: "WORK" },
    ],
  });
  await db.jobCheckIn.createMany({
    data: [
      { jobId: job.id, staffId: junior.id, date: new Date("2026-10-14"), createdAt: new Date("2026-10-14T01:00:00Z") },
      { jobId: otherJob.id, staffId: junior.id, date: new Date("2026-10-16"), createdAt: new Date("2026-10-16T01:00:00Z") },
    ],
  });
});

describe("team overview (database)", () => {
  it("lists active Seniors and Juniors assigned to the Manager's clients", async () => {
    const team = await teamOverview(manager, NOW);

    expect(team.map((member) => member.id).sort()).toEqual([senior.id, junior.id].sort());
    const bySenior = team.find((member) => member.id === senior.id);
    expect(bySenior?.clients.map((c) => c.id).sort()).toEqual([managedId, sourcedId].sort());
    expect(bySenior).toMatchObject({ jobs: 2, hoursThisWeek: 4.75, lastCheckIn: null });

    const byJunior = team.find((member) => member.id === junior.id);
    expect(byJunior?.clients.map((c) => c.id)).toEqual([managedId]);
    expect(byJunior).toMatchObject({ jobs: 1, hoursThisWeek: 0, lastCheckIn: new Date("2026-10-14T01:00:00Z") });
  });

  it("does not include another Manager's staff", async () => {
    const team = await teamOverview(manager, NOW);
    expect(team.some((member) => member.id === otherSenior.id)).toBe(false);
  });

  it("is for Managers only", async () => {
    await expect(teamOverview(partner)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(teamOverview(senior)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
