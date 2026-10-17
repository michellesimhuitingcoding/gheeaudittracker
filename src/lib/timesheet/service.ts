import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { diffFields, recordAudit } from "@/lib/audit";
import { canViewClient } from "@/lib/clients/permissions";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { jobTimecost } from "@/lib/timecost/timecost";
import { BILLABLE_CATEGORIES } from "@/lib/timecost/utilisation";
import { LOCK_LABELS, canAdvanceLock, nextLock } from "@/lib/timesheet/lock";
import { CATEGORY_LABELS, timesheetCategories } from "@/lib/timesheet/permissions";
import { MAX_HOURS_PER_DAY, type TimesheetEntryInput, timesheetEntrySchema } from "@/lib/timesheet/schema";

type Actor = { id: string; role: Role };
type Result = Exclude<FormState, null>;
type Tx = Prisma.TransactionClient;

function invalid(error: z.ZodError): Result {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors };
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const LOCKED = "This job's timesheet is locked.";

// The job's display name, or an error if the actor may not log time to it.
async function loggableJob(tx: Tx, actor: Actor, jobId: string): Promise<{ name: string } | { error: string }> {
  const job = await tx.auditJob.findUnique({
    where: { id: jobId },
    include: { client: { include: { assignedStaff: true } } },
  });
  if (!job) return { error: "Job not found." };
  const assignedStaffIds = job.client.assignedStaff.map((row) => row.staffId);
  if (!canViewClient(actor, { ...job.client, assignedStaffIds })) {
    return { error: "You cannot log time to this job." };
  }
  if (job.timesheetLock !== "OPEN") return { error: LOCKED };
  return { name: `${job.client.name} · FY ${job.year}` };
}

// Checks shared by add and update; returns the job name for the audit trail.
async function checkEntry(
  tx: Tx,
  actor: Actor,
  entry: TimesheetEntryInput,
  excludeId?: string,
): Promise<{ jobName: string | null } | Result> {
  if (!timesheetCategories(actor.role).includes(entry.category)) {
    return { ok: false, fieldErrors: { category: [`You cannot log ${CATEGORY_LABELS[entry.category]} time.`] } };
  }

  let jobName: string | null = null;
  if (entry.jobId) {
    const job = await loggableJob(tx, actor, entry.jobId);
    if ("error" in job) return { ok: false, fieldErrors: { jobId: [job.error] } };
    jobName = job.name;
  }

  const logged = await tx.timesheetEntry.aggregate({
    where: { staffId: actor.id, date: entry.date, ...(excludeId ? { id: { not: excludeId } } : {}) },
    _sum: { hours: true },
  });
  const loggedHundredths = Math.round(Number(logged._sum.hours ?? 0) * 100);
  if (loggedHundredths + Math.round(entry.hours * 100) > MAX_HOURS_PER_DAY * 100) {
    const left = Math.max(0, MAX_HOURS_PER_DAY * 100 - loggedHundredths) / 100;
    return { ok: false, fieldErrors: { hours: [`Only ${left} more hours can be logged on this day.`] } };
  }
  return { jobName };
}

const serializable = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

export async function addTimesheetEntry(actor: Actor, input: unknown): Promise<Result> {
  if (timesheetCategories(actor.role).length === 0) {
    return { ok: false, error: "Your role does not keep a timesheet." };
  }
  const parsed = timesheetEntrySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const entry = parsed.data;

  return db.$transaction(async (tx) => {
    const check = await checkEntry(tx, actor, entry);
    if ("ok" in check) return check;

    const created = await tx.timesheetEntry.create({ data: { ...entry, staffId: actor.id } });
    await recordAudit(tx, {
      action: "TIMESHEET_ENTRY_ADDED",
      actorId: actor.id,
      entityType: "TimesheetEntry",
      entityId: created.id,
      changes: {
        date: isoDate(entry.date),
        job: check.jobName,
        category: CATEGORY_LABELS[entry.category],
        hours: entry.hours,
        note: entry.note,
      },
    });
    return { ok: true, message: `Logged ${entry.hours} hours.` };
  }, serializable);
}

export async function updateTimesheetEntry(actor: Actor, entryId: string, input: unknown): Promise<Result> {
  const parsed = timesheetEntrySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const entry = parsed.data;

  return db.$transaction(async (tx) => {
    const existing = await tx.timesheetEntry.findUnique({
      where: { id: entryId },
      include: { job: { include: { client: { select: { name: true } } } } },
    });
    if (!existing || existing.staffId !== actor.id) {
      return { ok: false, error: "You can only change your own timesheet entries." };
    }
    if (existing.job && existing.job.timesheetLock !== "OPEN") return { ok: false, error: LOCKED };
    const check = await checkEntry(tx, actor, entry, entryId);
    if ("ok" in check) return check;

    await tx.timesheetEntry.update({ where: { id: entryId }, data: entry });
    const before = {
      date: isoDate(existing.date),
      job: existing.job ? `${existing.job.client.name} · FY ${existing.job.year}` : null,
      category: CATEGORY_LABELS[existing.category],
      hours: Number(existing.hours),
      note: existing.note,
    };
    const after = {
      date: isoDate(entry.date),
      job: check.jobName,
      category: CATEGORY_LABELS[entry.category],
      hours: entry.hours,
      note: entry.note,
    };
    const changes = diffFields(before, after, ["date", "job", "category", "hours", "note"]);
    if (Object.keys(changes).length > 0) {
      await recordAudit(tx, {
        action: "TIMESHEET_ENTRY_UPDATED",
        actorId: actor.id,
        entityType: "TimesheetEntry",
        entityId: entryId,
        changes,
      });
    }
    return { ok: true, message: "Entry updated." };
  }, serializable);
}

export async function removeTimesheetEntry(actor: Actor, entryId: string): Promise<Result> {
  return db.$transaction(async (tx) => {
    const existing = await tx.timesheetEntry.findUnique({
      where: { id: entryId },
      include: { job: { include: { client: { select: { name: true } } } } },
    });
    if (!existing || existing.staffId !== actor.id) {
      return { ok: false, error: "You can only remove your own timesheet entries." };
    }
    if (existing.job && existing.job.timesheetLock !== "OPEN") return { ok: false, error: LOCKED };

    await tx.timesheetEntry.delete({ where: { id: entryId } });
    await recordAudit(tx, {
      action: "TIMESHEET_ENTRY_REMOVED",
      actorId: actor.id,
      entityType: "TimesheetEntry",
      entityId: entryId,
      changes: {
        date: isoDate(existing.date),
        job: existing.job ? `${existing.job.client.name} · FY ${existing.job.year}` : null,
        category: CATEGORY_LABELS[existing.category],
        hours: Number(existing.hours),
        note: existing.note,
      },
    });
    return { ok: true, message: "Entry removed." };
  }, serializable);
}

// WORKFLOW.md §10: moves the job's timesheet one step along Open → Reviewed → Billed.
// Reviewing freezes the timecost at the hourly rates in force at that moment.
export async function advanceTimesheetLock(actor: Actor, jobId: string): Promise<Result> {
  return db.$transaction(async (tx) => {
    const job = await tx.auditJob.findUnique({
      where: { id: jobId },
      select: { timesheetLock: true, client: { select: { managerId: true, partnerId: true } } },
    });
    if (!job) return { ok: false, error: "Audit job not found." };
    const to = nextLock(job.timesheetLock);
    if (!to) return { ok: false, error: "This job's timesheet is already billed." };
    if (!canAdvanceLock(actor, job.client, to)) {
      return {
        ok: false,
        error:
          to === "REVIEWED"
            ? "Only the client's Manager or Partner can mark the timesheet Reviewed."
            : "Only the client's Manager or Partner, or an Admin, can mark the timesheet Billed.",
      };
    }

    const now = new Date();
    const changes: Record<string, unknown> = {
      timesheetLock: { from: LOCK_LABELS[job.timesheetLock], to: LOCK_LABELS[to] },
    };
    if (to === "REVIEWED") {
      const entries = await tx.timesheetEntry.findMany({
        where: { jobId, category: { in: [...BILLABLE_CATEGORIES] } },
        select: { hours: true, staff: { select: { hourlyRate: true } } },
      });
      const frozen = jobTimecost(
        entries.map((row) => ({
          hours: Number(row.hours),
          rate: row.staff.hourlyRate === null ? null : Number(row.staff.hourlyRate),
        })),
        { hours: null, cost: null },
      );
      await tx.auditJob.update({
        where: { id: jobId },
        data: {
          timesheetLock: to,
          timesheetReviewedById: actor.id,
          timesheetReviewedAt: now,
          frozenHours: frozen.hours.toFixed(2),
          frozenCost: frozen.cost.toFixed(2),
          frozenUnratedHours: frozen.unratedHours.toFixed(2),
        },
      });
      Object.assign(changes, {
        frozenHours: frozen.hours.toFixed(2),
        frozenCost: frozen.cost.toFixed(2),
        frozenUnratedHours: frozen.unratedHours.toFixed(2),
      });
    } else {
      await tx.auditJob.update({
        where: { id: jobId },
        data: { timesheetLock: to, timesheetBilledById: actor.id, timesheetBilledAt: now },
      });
    }
    await recordAudit(tx, {
      action: to === "REVIEWED" ? "TIMESHEET_REVIEWED" : "TIMESHEET_BILLED",
      actorId: actor.id,
      entityType: "AuditJob",
      entityId: jobId,
      changes,
    });
    return { ok: true, message: `Timesheet marked ${LOCK_LABELS[to]}.` };
  }, serializable);
}
