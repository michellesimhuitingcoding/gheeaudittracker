import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { recordAudit } from "@/lib/audit";
import { CLIENT_INTAKE_ROLES, canViewClient } from "@/lib/clients/permissions";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { createJobSchema, stageChangeSchema } from "@/lib/jobs/schema";
import { checkStageMove, needsReviewNote, stageLabel } from "@/lib/jobs/stages";

type Actor = { id: string; role: Role };
type Result = Exclude<FormState, null>;

function invalid(error: z.ZodError): Result {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors };
}

export function canCreateAuditJob(viewer: Actor, client: { managerId: string | null }): boolean {
  return CLIENT_INTAKE_ROLES.includes(viewer.role) || client.managerId === viewer.id;
}

export function isAuditable(client: { entityType: string; services: string[] }): boolean {
  return client.entityType === "SDN_BHD" && client.services.includes("AUDIT");
}

export async function createAuditJob(actor: Actor, clientId: string, input: unknown): Promise<Result> {
  const parsed = createJobSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { year } = parsed.data;

  try {
    return await db.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: { name: true, entityType: true, services: true, managerId: true },
      });
      if (!client) return { ok: false, error: "Client not found." };
      if (!canCreateAuditJob(actor, client)) {
        return { ok: false, error: "You do not have permission to create audit jobs for this client." };
      }
      if (!isAuditable(client)) {
        return { ok: false, error: "Audit jobs are only for Sdn Bhd clients with the Audit service." };
      }

      const job = await tx.auditJob.create({ data: { clientId, year, createdById: actor.id } });
      await recordAudit(tx, {
        action: "AUDIT_JOB_CREATED",
        actorId: actor.id,
        entityType: "AuditJob",
        entityId: job.id,
        changes: { year },
      });
      return { ok: true, message: `Audit for ${year} created.` };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, fieldErrors: { year: [`An audit for ${year} already exists for this client.`] } };
    }
    throw error;
  }
}

export async function moveAuditStage(actor: Actor, jobId: string, input: unknown): Promise<Result> {
  const parsed = stageChangeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const change = parsed.data;

  return db.$transaction(
    async (tx) => {
      const job = await tx.auditJob.findUnique({
        where: { id: jobId },
        include: { client: { include: { signingPartners: true, assignedStaff: true } } },
      });
      if (!job) return { ok: false, error: "Audit job not found." };

      const signingPartnerIds = job.client.signingPartners.map((row) => row.partnerId);
      const assignedStaffIds = job.client.assignedStaff.map((row) => row.staffId);
      if (!canViewClient(actor, { ...job.client, assignedStaffIds })) {
        return { ok: false, error: "You do not have permission to update this job." };
      }
      if (change.fromStage !== job.stage) {
        return { ok: false, error: "Someone else has moved this job. Refresh to see the latest stage." };
      }
      const check = checkStageMove(actor, job.stage, { ...job.client, signingPartnerIds });
      if (!check.ok) return { ok: false, error: check.reason };
      if (needsReviewNote(job.stage) && !change.reviewNote) {
        return { ok: false, fieldErrors: { reviewNote: ["A review note is required to complete a review stage."] } };
      }

      await tx.auditStageChange.create({
        data: {
          jobId,
          fromStage: job.stage,
          toStage: check.to,
          byId: actor.id,
          progressNote: change.progressNote,
          hours: change.hours,
          nextAction: change.nextAction,
          reviewNote: change.reviewNote,
        },
      });
      await tx.auditJob.update({ where: { id: jobId }, data: { stage: check.to } });
      await recordAudit(tx, {
        action: "AUDIT_STAGE_CHANGED",
        actorId: actor.id,
        entityType: "AuditJob",
        entityId: jobId,
        changes: {
          stage: { from: stageLabel(job.stage), to: stageLabel(check.to) },
          hours: change.hours,
          progressNote: change.progressNote,
          nextAction: change.nextAction,
          ...(change.reviewNote ? { reviewNote: change.reviewNote } : {}),
        },
      });
      return { ok: true, message: `Moved to ${stageLabel(check.to)}.` };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
