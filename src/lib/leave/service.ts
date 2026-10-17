import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { formatDate, isoDate } from "@/lib/deadlines";
import type { FormState } from "@/lib/form-state";
import { leaveDates } from "@/lib/leave/leave";
import { canManageLeave } from "@/lib/leave/permissions";
import { leaveSchema } from "@/lib/leave/schema";

type Actor = { id: string; role: Role };
type Result = Exclude<FormState, null>;

const serializable = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

const NOT_ALLOWED = "You can only change your own leave.";

function invalid(error: z.ZodError): Result {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors };
}

export async function addLeave(actor: Actor, input: unknown): Promise<Result> {
  const parsed = leaveSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const leave = parsed.data;
  if (!canManageLeave(actor, leave.staffId)) return { ok: false, error: NOT_ALLOWED };

  return db.$transaction(async (tx) => {
    const staff = await tx.staff.findUnique({ where: { id: leave.staffId }, select: { name: true, active: true } });
    if (!staff || !staff.active) return { ok: false, error: "Staff member not found." };

    const holidays = await tx.publicHoliday.findMany({
      where: { date: { gte: leave.from, lte: leave.to } },
      select: { date: true },
    });
    const dates = leaveDates(leave.from, leave.to, new Set(holidays.map((row) => isoDate(row.date))));
    if (dates.length === 0) {
      return { ok: false, fieldErrors: { from: ["There are no working days in this range."] } };
    }

    const clash = await tx.leaveEntry.findFirst({
      where: { staffId: leave.staffId, date: { in: dates } },
      orderBy: { date: "asc" },
      select: { date: true },
    });
    if (clash) {
      return {
        ok: false,
        fieldErrors: { from: [`Leave is already recorded on ${formatDate(clash.date)}. Remove it first to change it.`] },
      };
    }

    await tx.leaveEntry.createMany({
      data: dates.map((date) => ({
        staffId: leave.staffId,
        date,
        hours: leave.hours,
        note: leave.note,
        createdById: actor.id,
      })),
    });
    const first = isoDate(dates[0]);
    const last = isoDate(dates.at(-1)!);
    await recordAudit(tx, {
      action: "LEAVE_ADDED",
      actorId: actor.id,
      entityType: "Staff",
      entityId: leave.staffId,
      changes: {
        staff: staff.name,
        date: first === last ? first : `${first} to ${last}`,
        days: dates.length,
        hours: leave.hours,
        note: leave.note,
      },
    });
    return {
      ok: true,
      message:
        dates.length === 1
          ? `Leave recorded on ${formatDate(dates[0])}.`
          : `Leave recorded for ${dates.length} working days.`,
    };
  }, serializable);
}

export async function removeLeave(actor: Actor, entryId: string): Promise<Result> {
  return db.$transaction(async (tx) => {
    const entry = await tx.leaveEntry.findUnique({
      where: { id: entryId },
      include: { staff: { select: { name: true } } },
    });
    if (!entry) return { ok: false, error: "Leave not found." };
    if (!canManageLeave(actor, entry.staffId)) return { ok: false, error: NOT_ALLOWED };

    await tx.leaveEntry.delete({ where: { id: entryId } });
    await recordAudit(tx, {
      action: "LEAVE_REMOVED",
      actorId: actor.id,
      entityType: "Staff",
      entityId: entry.staffId,
      changes: { staff: entry.staff.name, date: isoDate(entry.date), hours: Number(entry.hours), note: entry.note },
    });
    return { ok: true, message: "Leave removed." };
  });
}
