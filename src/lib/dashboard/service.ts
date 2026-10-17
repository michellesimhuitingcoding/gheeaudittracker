import type { AuditStage, Role } from "@/generated/prisma/enums";
import { clientListFilter } from "@/lib/clients/permissions";
import { type Deadline, DUE_SOON_DAYS, isOverBudget, splitDeadlines, teamTotals } from "@/lib/dashboard/summary";
import { db } from "@/lib/db";
import { formCApplies, formCDuesBetween, todayDate } from "@/lib/deadlines";
import { ForbiddenError } from "@/lib/permissions";
import { myProgress } from "@/lib/progress/service";
import type { ProgressSummary } from "@/lib/progress/summary";
import { teamOverview } from "@/lib/team/service";
import type { Utilisation } from "@/lib/timecost/service";
import { type JobTimecost, compareToBudget, jobTimecost } from "@/lib/timecost/timecost";
import { BILLABLE_CATEGORIES } from "@/lib/timecost/utilisation";

// A pre-audit deadline stops mattering once the job has moved past Pre-audit.
const BEFORE_READY: readonly AuditStage[] = ["DOCUMENTS_RECEIVED", "PRE_AUDIT"];

export type OverBudgetJob = { id: string; year: number; clientName: string; timecost: JobTimecost };

export type ManagerDashboard = {
  progress: ProgressSummary;
  team: { people: number; hoursThisWeek: number; utilisation: Utilisation };
  overBudget: OverBudgetJob[];
  overdue: Deadline[];
  dueSoon: Deadline[];
};

// WORKFLOW.md §20 Manager Dashboard: a roll-up of My Progress, Team Overview,
// budget vs actual and deadlines on the Manager's own clients.
export async function managerDashboard(viewer: { id: string; role: Role }, now = new Date()): Promise<ManagerDashboard> {
  if (viewer.role !== "MANAGER") throw new ForbiddenError();
  const clientFilter = clientListFilter(viewer);
  if (!clientFilter) throw new ForbiddenError();

  const today = todayDate(now);
  const horizon = new Date(today.getTime() + DUE_SOON_DAYS * 86_400_000);

  const [{ summary }, team, budgeted, clients, preAudit] = await Promise.all([
    myProgress(viewer, now),
    teamOverview(viewer, now),
    db.auditJob.findMany({
      where: { client: clientFilter, OR: [{ budgetHours: { not: null } }, { budgetCost: { not: null } }] },
      select: {
        id: true,
        year: true,
        budgetHours: true,
        budgetCost: true,
        timesheetLock: true,
        frozenHours: true,
        frozenCost: true,
        frozenUnratedHours: true,
        client: { select: { name: true } },
      },
    }),
    db.client.findMany({
      where: { AND: [clientFilter, { status: "ACTIVE", entityType: { in: ["SDN_BHD", "PLT"] } }] },
      select: { id: true, name: true, entityType: true, fyeDay: true, fyeMonth: true },
    }),
    db.auditJob.findMany({
      where: {
        client: clientFilter,
        preAuditDeadline: { lte: horizon },
        OR: [{ stage: null }, { stage: { in: [...BEFORE_READY] } }],
      },
      select: { id: true, year: true, preAuditDeadline: true, client: { select: { name: true } } },
    }),
  ]);

  // Rates are live until the timesheet is reviewed, which freezes the timecost (WORKFLOW.md §10).
  const isFrozen = (job: (typeof budgeted)[number]) =>
    job.timesheetLock !== "OPEN" && job.frozenHours !== null && job.frozenCost !== null;
  const liveEntries = await db.timesheetEntry.findMany({
    where: { jobId: { in: budgeted.filter((job) => !isFrozen(job)).map((job) => job.id) }, category: { in: [...BILLABLE_CATEGORIES] } },
    select: { jobId: true, hours: true, staff: { select: { hourlyRate: true } } },
  });

  const overBudget = budgeted
    .map((job) => {
      const budget = {
        hours: job.budgetHours === null ? null : Number(job.budgetHours),
        cost: job.budgetCost === null ? null : Number(job.budgetCost),
      };
      const timecost = isFrozen(job)
        ? compareToBudget(
            {
              hours: Number(job.frozenHours),
              cost: Number(job.frozenCost),
              unratedHours: Number(job.frozenUnratedHours ?? 0),
            },
            budget,
          )
        : jobTimecost(
            liveEntries
              .filter((row) => row.jobId === job.id)
              .map((row) => ({
                hours: Number(row.hours),
                rate: row.staff.hourlyRate === null ? null : Number(row.staff.hourlyRate),
              })),
            budget,
          );
      return { id: job.id, year: job.year, clientName: job.client.name, timecost };
    })
    .filter((job) => isOverBudget(job.timecost))
    .sort((a, b) => a.clientName.localeCompare(b.clientName) || b.year - a.year);

  // Form C filing is not tracked, so a Form C date is only shown while due soon.
  const deadlines: Deadline[] = [
    ...clients
      .filter((client) => formCApplies(client.entityType))
      .flatMap((client) =>
        formCDuesBetween(client.fyeDay, client.fyeMonth, today, horizon).map((date) => ({
          date,
          kind: "FORM_C" as const,
          label: `Form C · ${client.name}`,
          href: `/clients/${client.id}`,
        })),
      ),
    ...preAudit.map((job) => ({
      date: job.preAuditDeadline!,
      kind: "PRE_AUDIT" as const,
      label: `Pre-audit · ${job.client.name} FY ${job.year}`,
      href: `/jobs/${job.id}`,
    })),
  ];

  return { progress: summary, team: teamTotals(team), overBudget, ...splitDeadlines(deadlines, today) };
}
