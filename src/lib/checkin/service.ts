import type { Role } from "@/generated/prisma/enums";
import { recordAudit } from "@/lib/audit";
import { canCheckIn } from "@/lib/checkin/activity";
import { canViewClient } from "@/lib/clients/permissions";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { todayInMyt } from "@/lib/format";

type Actor = { id: string; role: Role };
type Result = Exclude<FormState, null>;

export async function checkIn(actor: Actor, jobId: string, now = new Date()): Promise<Result> {
  if (!canCheckIn(actor.role)) return { ok: false, error: "Your role does not check in to jobs." };
  const today = todayInMyt(now);

  return db.$transaction(async (tx) => {
    const job = await tx.auditJob.findUnique({
      where: { id: jobId },
      include: { client: { include: { assignedStaff: true } } },
    });
    if (!job) return { ok: false, error: "Audit job not found." };
    const assignedStaffIds = job.client.assignedStaff.map((row) => row.staffId);
    if (!canViewClient(actor, { ...job.client, assignedStaffIds })) {
      return { ok: false, error: "You cannot check in to this job." };
    }

    const date = new Date(today);
    const created = await tx.jobCheckIn.createMany({
      data: { jobId, staffId: actor.id, date },
      skipDuplicates: true,
    });
    if (created.count === 0) return { ok: true, message: "You already checked in today." };

    await recordAudit(tx, {
      action: "JOB_CHECKED_IN",
      actorId: actor.id,
      entityType: "AuditJob",
      entityId: jobId,
      changes: { date: today },
    });
    return { ok: true, message: "Checked in for today." };
  });
}
