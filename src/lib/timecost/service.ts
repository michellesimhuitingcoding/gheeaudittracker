import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isoDate } from "@/lib/deadlines";
import type { FormState } from "@/lib/form-state";
import { EDIT_HOURLY_RATES, MANAGE_PUBLIC_HOLIDAYS, canSetJobBudget } from "@/lib/timecost/permissions";
import { hourlyRateSchema, jobBudgetSchema, publicHolidaySchema } from "@/lib/timecost/schema";
import {
  BILLABLE_CATEGORIES,
  availableHours,
  leaveHoursOnWorkingDays,
  monthToDateInMyt,
  utilisationPercent,
} from "@/lib/timecost/utilisation";

type Actor = { id: string; role: Role };
type Result = Exclude<FormState, null>;

const serializable = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

function invalid(error: z.ZodError): Result {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors };
}

const amount = (value: Prisma.Decimal | null) => (value === null ? null : value.toFixed(2));
const fixed = (value: number | null) => (value === null ? null : value.toFixed(2));

export async function setHourlyRate(actor: Actor, staffId: string, input: unknown): Promise<Result> {
  if (!EDIT_HOURLY_RATES.includes(actor.role)) {
    return { ok: false, error: "You do not have permission to edit hourly rates." };
  }
  const parsed = hourlyRateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const to = fixed(parsed.data.hourlyRate);

  return db.$transaction(async (tx) => {
    const staff = await tx.staff.findUnique({ where: { id: staffId }, select: { hourlyRate: true } });
    if (!staff) return { ok: false, error: "Staff member not found." };
    const from = amount(staff.hourlyRate);
    if (from === to) return { ok: true, message: "No changes to save." };

    await tx.staff.update({ where: { id: staffId }, data: { hourlyRate: to } });
    await recordAudit(tx, {
      action: "HOURLY_RATE_CHANGED",
      actorId: actor.id,
      entityType: "Staff",
      entityId: staffId,
      changes: { hourlyRate: { from, to } },
    });
    return { ok: true, message: "Hourly rate saved." };
  }, serializable);
}

export async function setJobBudget(actor: Actor, jobId: string, input: unknown): Promise<Result> {
  const parsed = jobBudgetSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const after = { budgetHours: fixed(parsed.data.budgetHours), budgetCost: fixed(parsed.data.budgetCost) };

  return db.$transaction(async (tx) => {
    const job = await tx.auditJob.findUnique({
      where: { id: jobId },
      select: { budgetHours: true, budgetCost: true, client: { select: { managerId: true, partnerId: true } } },
    });
    if (!job) return { ok: false, error: "Audit job not found." };
    if (!canSetJobBudget(actor, job.client)) {
      return { ok: false, error: "Only the client's Manager or Partner can set the budget." };
    }

    const before = { budgetHours: amount(job.budgetHours), budgetCost: amount(job.budgetCost) };
    const changes: Record<string, { from: string | null; to: string | null }> = {};
    for (const field of ["budgetHours", "budgetCost"] as const) {
      if (before[field] !== after[field]) changes[field] = { from: before[field], to: after[field] };
    }
    if (Object.keys(changes).length === 0) return { ok: true, message: "No changes to save." };

    await tx.auditJob.update({ where: { id: jobId }, data: after });
    await recordAudit(tx, {
      action: "JOB_BUDGET_CHANGED",
      actorId: actor.id,
      entityType: "AuditJob",
      entityId: jobId,
      changes,
    });
    return { ok: true, message: "Budget saved." };
  }, serializable);
}

export async function addPublicHoliday(actor: Actor, input: unknown): Promise<Result> {
  if (!MANAGE_PUBLIC_HOLIDAYS.includes(actor.role)) {
    return { ok: false, error: "Only the Master Admin can change public holidays." };
  }
  const parsed = publicHolidaySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { date, name } = parsed.data;

  try {
    return await db.$transaction(async (tx) => {
      const holiday = await tx.publicHoliday.create({ data: { date, name } });
      await recordAudit(tx, {
        action: "PUBLIC_HOLIDAY_ADDED",
        actorId: actor.id,
        entityType: "PublicHoliday",
        entityId: holiday.id,
        changes: { date: isoDate(date), name },
      });
      return { ok: true, message: `${name} added.` };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, fieldErrors: { date: ["A public holiday is already set on this date."] } };
    }
    throw error;
  }
}

export async function removePublicHoliday(actor: Actor, holidayId: string): Promise<Result> {
  if (!MANAGE_PUBLIC_HOLIDAYS.includes(actor.role)) {
    return { ok: false, error: "Only the Master Admin can change public holidays." };
  }
  return db.$transaction(async (tx) => {
    const holiday = await tx.publicHoliday.findUnique({ where: { id: holidayId } });
    if (!holiday) return { ok: false, error: "Public holiday not found." };
    await tx.publicHoliday.delete({ where: { id: holidayId } });
    await recordAudit(tx, {
      action: "PUBLIC_HOLIDAY_REMOVED",
      actorId: actor.id,
      entityType: "PublicHoliday",
      entityId: holidayId,
      changes: { date: isoDate(holiday.date), name: holiday.name },
    });
    return { ok: true, message: `${holiday.name} removed.` };
  });
}

export type Utilisation = { billableHours: number; availableHours: number; percent: number | null };

// Month-to-date utilisation per person: billable hours (Work + OT on a job)
// ÷ available hours (8 per weekday, less public holidays and the person's leave).
export async function monthToDateUtilisation(
  staffIds: readonly string[],
  now = new Date(),
): Promise<Map<string, Utilisation>> {
  const period = monthToDateInMyt(now);
  const [holidays, billable, leave] = await Promise.all([
    db.publicHoliday.findMany({ where: { date: { gte: period.start, lt: period.end } }, select: { date: true } }),
    db.timesheetEntry.groupBy({
      by: ["staffId"],
      where: {
        staffId: { in: [...staffIds] },
        category: { in: [...BILLABLE_CATEGORIES] },
        jobId: { not: null },
        date: { gte: period.start, lt: period.end },
      },
      _sum: { hours: true },
    }),
    db.leaveEntry.findMany({
      where: { staffId: { in: [...staffIds] }, date: { gte: period.start, lt: period.end } },
      select: { staffId: true, date: true, hours: true },
    }),
  ]);
  const holidayDates = new Set(holidays.map((row) => isoDate(row.date)));
  const working = availableHours(period.start, period.end, holidayDates);
  const hoursByStaff = new Map(billable.map((row) => [row.staffId, Number(row._sum.hours ?? 0)]));
  const leaveByStaff = new Map<string, { date: Date; hours: number }[]>();
  for (const row of leave) {
    leaveByStaff.set(row.staffId, [...(leaveByStaff.get(row.staffId) ?? []), { date: row.date, hours: Number(row.hours) }]);
  }

  return new Map(
    staffIds.map((id) => {
      const billableHours = hoursByStaff.get(id) ?? 0;
      const available = Math.max(0, working - leaveHoursOnWorkingDays(leaveByStaff.get(id) ?? [], holidayDates));
      return [id, { billableHours, availableHours: available, percent: utilisationPercent(billableHours, available) }];
    }),
  );
}
