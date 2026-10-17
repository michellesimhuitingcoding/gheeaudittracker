import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { recordAudit } from "@/lib/audit";
import { CLIENT_INTAKE_ROLES, canViewClient } from "@/lib/clients/permissions";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { createJobSchema, stageChangeSchema } from "@/lib/jobs/schema";
import { checkStageMove, needsReviewNote, stageLabel } from "@/lib/jobs/stages";
import type { JobPeople } from "@/lib/notifications/rules";
import { notifyJobCreated, notifyStageChange } from "@/lib/notifications/service";

type Actor = { id: string; role: Role };
type Result = Exclude<FormState, null>;

function invalid(error: z.ZodError): Result {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors };
}

function jobPeople(client: {
  managerId: string | null;
  partnerId: string | null;
  seniorId: string | null;
  signingPartners: { partnerId: string }[];
  assignedStaff: { staffId: string; staff: { role: Role } }[];
}): JobPeople {
  return {
    managerId: client.managerId,
    partnerId: client.partnerId,
    seniorId: client.seniorId,
    signingPartnerIds: client.signingPartners.map((row) => row.partnerId),
    assignedStaff: client.assignedStaff.map((row) => ({ staffId: row.staffId, role: row.staff.role })),
  };
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
        select: {
          name: true,
          entityType: true,
          services: true,
          managerId: true,
          partnerId: true,
          seniorId: true,
          signingPartners: { select: { partnerId: true } },
          assignedStaff: { select: { staffId: true, staff: { select: { role: true } } } },
        },
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
      await notifyJobCreated(
        tx,
        actor.id,
        { id: job.id, year, clientId, clientName: client.name },
        jobPeople(client),
      );
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
        include: {
          client: { include: { signingPartners: true, assignedStaff: { include: { staff: { select: { role: true } } } } } },
        },
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
      await notifyStageChange(
        tx,
        actor.id,
        { id: jobId, year: job.year, clientId: job.clientId, clientName: job.client.name },
        jobPeople(job.client),
        job.stage,
        check.to,
      );
      return { ok: true, message: `Moved to ${stageLabel(check.to)}.` };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
