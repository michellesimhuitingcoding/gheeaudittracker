import type { AuditStage, Role } from "@/generated/prisma/enums";
import { daysSince, lastActivity } from "@/lib/checkin/activity";
import { clientListFilter } from "@/lib/clients/permissions";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/permissions";
import { type ProgressSummary, summarise } from "@/lib/progress/summary";

export type ProgressJob = {
  id: string;
  year: number;
  stage: AuditStage | null;
  clientId: string;
  clientName: string;
  lastActivity: Date;
  days: number;
  lastUpdatedBy: string | null;
  hours: number;
};

// WORKFLOW.md §20 My Progress: audit jobs on the Manager's own clients
// (the clients they manage or sourced), stalest first.
export async function myProgress(
  viewer: { id: string; role: Role },
  now = new Date(),
): Promise<{ jobs: ProgressJob[]; summary: ProgressSummary }> {
  if (viewer.role !== "MANAGER") throw new ForbiddenError();
  const clientFilter = clientListFilter(viewer);
  if (!clientFilter) throw new ForbiddenError();

  const rows = await db.auditJob.findMany({
    where: { client: clientFilter },
    select: {
      id: true,
      year: true,
      stage: true,
      createdAt: true,
      client: { select: { id: true, name: true } },
      checkIns: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      stageChanges: { orderBy: { at: "desc" }, take: 1, select: { at: true, by: { select: { name: true } } } },
    },
  });
  const hours = await db.timesheetEntry.groupBy({
    by: ["jobId"],
    where: { jobId: { in: rows.map((row) => row.id) } },
    _sum: { hours: true },
  });
  const hoursByJob = new Map(hours.map((row) => [row.jobId, Number(row._sum.hours ?? 0)]));

  const jobs = rows.map((row) => {
    const last = row.stageChanges[0];
    const activity = lastActivity([row.createdAt, row.checkIns[0]?.createdAt, last?.at]) ?? row.createdAt;
    return {
      id: row.id,
      year: row.year,
      stage: row.stage,
      clientId: row.client.id,
      clientName: row.client.name,
      lastActivity: activity,
      days: daysSince(activity, now),
      lastUpdatedBy: last?.by.name ?? null,
      hours: hoursByJob.get(row.id) ?? 0,
    };
  });
  jobs.sort((a, b) => b.days - a.days || a.clientName.localeCompare(b.clientName) || b.year - a.year);
  return { jobs, summary: summarise(jobs) };
}
