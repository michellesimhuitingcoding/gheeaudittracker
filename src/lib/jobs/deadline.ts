import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isoDate } from "@/lib/deadlines";
import type { FormState } from "@/lib/form-state";

type Actor = { id: string; role: Role };
type Result = Exclude<FormState, null>;

// WORKFLOW.md §3: the client's Partner (or a signing partner) confirms the pre-audit deadline.
export function canConfirmPreAuditDeadline(
  viewer: Actor,
  people: { partnerId: string | null; signingPartnerIds: string[] },
): boolean {
  return viewer.role === "PARTNER" && (people.partnerId === viewer.id || people.signingPartnerIds.includes(viewer.id));
}

export const preAuditDeadlineSchema = z.object({
  preAuditDeadline: z
    .string({ error: "Choose the pre-audit deadline." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Choose the pre-audit deadline." })
    .transform((value, ctx) => {
      const date = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(date.getTime()) || isoDate(date) !== value) {
        ctx.addIssue({ code: "custom", message: "Enter a valid date." });
        return z.NEVER;
      }
      return date;
    }),
});

export async function confirmPreAuditDeadline(actor: Actor, jobId: string, input: unknown): Promise<Result> {
  const parsed = preAuditDeadlineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const deadline = parsed.data.preAuditDeadline;

  return db.$transaction(
    async (tx) => {
      const job = await tx.auditJob.findUnique({
        where: { id: jobId },
        include: { client: { include: { signingPartners: true } } },
      });
      if (!job) return { ok: false, error: "Audit job not found." };
      const signingPartnerIds = job.client.signingPartners.map((row) => row.partnerId);
      if (!canConfirmPreAuditDeadline(actor, { partnerId: job.client.partnerId, signingPartnerIds })) {
        return { ok: false, error: "Only the client's Partner or a signing partner can confirm the pre-audit deadline." };
      }

      const before = job.preAuditDeadline ? isoDate(job.preAuditDeadline) : null;
      const after = isoDate(deadline);
      if (before === after) return { ok: true, message: "No changes to save." };

      await tx.auditJob.update({
        where: { id: jobId },
        data: {
          preAuditDeadline: deadline,
          preAuditDeadlineConfirmedById: actor.id,
          preAuditDeadlineConfirmedAt: new Date(),
        },
      });
      await recordAudit(tx, {
        action: "PRE_AUDIT_DEADLINE_CONFIRMED",
        actorId: actor.id,
        entityType: "AuditJob",
        entityId: jobId,
        changes: { preAuditDeadline: { from: before, to: after } },
      });
      return { ok: true, message: "Pre-audit deadline confirmed." };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
