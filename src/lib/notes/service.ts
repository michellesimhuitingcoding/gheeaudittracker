import { z } from "zod";
import type { Role } from "@/generated/prisma/enums";
import { recordAudit } from "@/lib/audit";
import { canViewClient } from "@/lib/clients/permissions";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { noteSchema } from "@/lib/notes/schema";

type Actor = { id: string; role: Role };
type Result = Exclude<FormState, null>;

// Anyone who can see the client can read and add its internal notes.
// `jobId` ties the note to one of the client's audit jobs.
export async function addInternalNote(
  actor: Actor,
  target: { clientId: string; jobId?: string | null },
  input: unknown,
): Promise<Result> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { body } = parsed.data;
  const jobId = target.jobId ?? null;

  return db.$transaction(async (tx) => {
    const client = await tx.client.findUnique({
      where: { id: target.clientId },
      include: { assignedStaff: { select: { staffId: true } } },
    });
    if (!client) return { ok: false, error: "Client not found." };
    const assignedStaffIds = client.assignedStaff.map((row) => row.staffId);
    if (!canViewClient(actor, { ...client, assignedStaffIds })) {
      return { ok: false, error: "You do not have permission to add notes to this client." };
    }
    if (jobId) {
      const job = await tx.auditJob.findUnique({ where: { id: jobId }, select: { clientId: true } });
      if (!job || job.clientId !== client.id) return { ok: false, error: "Audit job not found." };
    }

    const note = await tx.internalNote.create({ data: { clientId: client.id, jobId, authorId: actor.id, body } });
    await recordAudit(tx, {
      action: "INTERNAL_NOTE_ADDED",
      actorId: actor.id,
      entityType: jobId ? "AuditJob" : "Client",
      entityId: jobId ?? client.id,
      changes: { note: body },
      detail: note.id,
    });
    return { ok: true, message: "Note added." };
  });
}
