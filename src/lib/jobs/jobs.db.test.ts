import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { createAuditJob, moveAuditStage } from "@/lib/jobs/service";

type Person = { id: string; role: Role };
const tag = () => randomUUID().slice(0, 8);
let admin: Person, auditAdmin: Person, manager: Person, otherManager: Person, partner: Person, senior: Person, outsider: Person;
let clientId: string;

async function staff(role: Role, name: string): Promise<Person> {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `J-${id}`, name, email: `j-${id}@example.com`, role, passwordHash: "x" },
  });
  return { id: member.id, role };
}

const gate = (fromStage: string, extra: Record<string, unknown> = {}) => ({
  fromStage,
  progressNote: "Done",
  hours: "2",
  nextAction: "Next",
  ...extra,
});

beforeAll(async () => {
  admin = await staff("ADMIN", "Job Admin");
  auditAdmin = await staff("AUDIT_ADMIN_ASSISTANT", "Job Audit Admin");
  manager = await staff("MANAGER", "Job Manager");
  otherManager = await staff("MANAGER", "Other Job Manager");
  partner = await staff("PARTNER", "Job Partner");
  senior = await staff("SENIOR", "Job Senior");
  outsider = await staff("SENIOR", "Unassigned Senior");
  const client = await db.client.create({
    data: {
      name: `Audit Co ${tag()}`,
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
  clientId = client.id;
});

describe("audit jobs (database)", () => {
  it("creates one job per client per year, only for audit clients", async () => {
    expect(await createAuditJob(otherManager, clientId, { year: 2024 })).toMatchObject({ ok: false });
    expect(await createAuditJob(manager, clientId, { year: 2024 })).toMatchObject({ ok: true });
    expect(await createAuditJob(admin, clientId, { year: 2024 })).toMatchObject({
      ok: false,
      fieldErrors: { year: ["An audit for 2024 already exists for this client."] },
    });

    const taxOnly = await db.client.create({
      data: { name: `Tax Co ${tag()}`, entityType: "SDN_BHD", fyeDay: 31, fyeMonth: 12, ownerId: manager.id, services: ["TAX"] },
    });
    expect(await createAuditJob(admin, taxOnly.id, { year: 2024 })).toMatchObject({
      ok: false,
      error: "Audit jobs are only for Sdn Bhd clients with the Audit service.",
    });
  });

  it("moves through the stages with the right people, logging each change", async () => {
    await createAuditJob(admin, clientId, { year: 2025 });
    const job = await db.auditJob.findFirstOrThrow({ where: { clientId, year: 2025 } });

    expect(await moveAuditStage(auditAdmin, job.id, gate(""))).toMatchObject({ ok: true });
    expect(await moveAuditStage(outsider, job.id, gate("DOCUMENTS_RECEIVED"))).toMatchObject({ ok: false });
    for (const from of ["DOCUMENTS_RECEIVED", "PRE_AUDIT", "READY", "IN_PROGRESS"]) {
      expect(await moveAuditStage(senior, job.id, gate(from))).toMatchObject({ ok: true });
    }
    expect(await moveAuditStage(senior, job.id, gate("MANAGER_REVIEW", { reviewNote: "x" }))).toMatchObject({
      ok: false,
    });
    expect(await moveAuditStage(manager, job.id, gate("MANAGER_REVIEW"))).toMatchObject({
      ok: false,
      fieldErrors: { reviewNote: ["A review note is required to complete a review stage."] },
    });
    expect(await moveAuditStage(manager, job.id, gate("MANAGER_REVIEW", { reviewNote: "Looks fine" }))).toMatchObject({
      ok: true,
    });

    const updated = await db.auditJob.findUniqueOrThrow({ where: { id: job.id }, include: { stageChanges: true } });
    expect(updated.stage).toBe("PARTNER_REVIEW");
    expect(updated.stageChanges).toHaveLength(6);
    expect(updated.stageChanges.every((change) => change.hours.toString() === "2")).toBe(true);

    const entry = await db.auditLog.findFirstOrThrow({
      where: { entityType: "AuditJob", entityId: job.id },
      orderBy: [{ at: "desc" }, { id: "desc" }],
    });
    expect(entry).toMatchObject({
      action: "AUDIT_STAGE_CHANGED",
      actorId: manager.id,
      changes: { stage: { from: "5. Manager review", to: "6. Partner review" }, reviewNote: "Looks fine" },
    });
  });

  it("rejects a move based on a stale stage", async () => {
    await createAuditJob(admin, clientId, { year: 2026 });
    const job = await db.auditJob.findFirstOrThrow({ where: { clientId, year: 2026 } });
    expect(await moveAuditStage(senior, job.id, gate(""))).toMatchObject({ ok: true });
    expect(await moveAuditStage(senior, job.id, gate(""))).toEqual({
      ok: false,
      error: "Someone else has moved this job. Refresh to see the latest stage.",
    });
  });
});
