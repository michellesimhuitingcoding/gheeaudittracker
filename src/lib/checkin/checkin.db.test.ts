import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { checkIn } from "@/lib/checkin/service";
import { db } from "@/lib/db";

type Person = { id: string; role: Role };
const tag = () => randomUUID().slice(0, 8);
let manager: Person, partner: Person, senior: Person, outsider: Person, admin: Person;
let jobId: string;

async function staff(role: Role, name: string): Promise<Person> {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `C-${id}`, name, email: `c-${id}@example.com`, role, passwordHash: "x" },
  });
  return { id: member.id, role };
}

beforeAll(async () => {
  manager = await staff("MANAGER", "Check Manager");
  partner = await staff("PARTNER", "Check Partner");
  senior = await staff("SENIOR", "Check Senior");
  outsider = await staff("SENIOR", "Unassigned Check Senior");
  admin = await staff("ADMIN", "Check Admin");
  const client = await db.client.create({
    data: {
      name: `Check Co ${tag()}`,
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

describe("check-in (database)", () => {
  it("records one check-in per person per day and logs it", async () => {
    const now = new Date("2026-10-17T02:00:00Z");
    expect(await checkIn(senior, jobId, now)).toEqual({ ok: true, message: "Checked in for today." });
    expect(await checkIn(senior, jobId, now)).toEqual({ ok: true, message: "You already checked in today." });
    expect(await checkIn(manager, jobId, now)).toMatchObject({ ok: true });

    expect(await db.jobCheckIn.count({ where: { jobId } })).toBe(2);
    expect(await db.auditLog.count({ where: { action: "JOB_CHECKED_IN", entityId: jobId } })).toBe(2);
  });

  it("blocks people who cannot see the job or do not check in", async () => {
    expect(await checkIn(outsider, jobId)).toEqual({ ok: false, error: "You cannot check in to this job." });
    expect(await checkIn(admin, jobId)).toEqual({ ok: false, error: "Your role does not check in to jobs." });
    expect(await checkIn(senior, "missing")).toEqual({ ok: false, error: "Audit job not found." });
  });
});
