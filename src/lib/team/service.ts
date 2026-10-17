import type { Role } from "@/generated/prisma/enums";
import { clientListFilter } from "@/lib/clients/permissions";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/permissions";
import { weekInMyt } from "@/lib/team/week";
import { type Utilisation, monthToDateUtilisation } from "@/lib/timecost/service";

export type TeamMember = {
  id: string;
  name: string;
  role: Role;
  clients: { id: string; name: string }[];
  jobs: number;
  hoursThisWeek: number;
  lastCheckIn: Date | null;
  utilisation: Utilisation;
  leaveThisWeek: { date: Date; hours: number }[];
};

const TEAM_ROLES: readonly Role[] = ["SENIOR", "JUNIOR"];

// WORKFLOW.md §4/§20 Team Overview: a Manager's team is the active Seniors and
// Juniors currently assigned to the Manager's own clients (managed or sourced).
// There is no reporting line — membership follows client assignments.
export async function teamOverview(viewer: { id: string; role: Role }, now = new Date()): Promise<TeamMember[]> {
  if (viewer.role !== "MANAGER") throw new ForbiddenError();
  const clientFilter = clientListFilter(viewer);
  if (!clientFilter) throw new ForbiddenError();

  const clients = await db.client.findMany({
    where: clientFilter,
    select: {
      id: true,
      name: true,
      seniorId: true,
      assignedStaff: { select: { staffId: true } },
      auditJobs: { select: { id: true } },
    },
  });

  // A Senior can be both the client's senior and on its assigned staff.
  const clientsByStaff = new Map<string, Map<string, (typeof clients)[number]>>();
  for (const client of clients) {
    for (const staffId of [client.seniorId, ...client.assignedStaff.map((row) => row.staffId)]) {
      if (!staffId) continue;
      const shared = clientsByStaff.get(staffId) ?? new Map();
      shared.set(client.id, client);
      clientsByStaff.set(staffId, shared);
    }
  }

  const people = await db.staff.findMany({
    where: { id: { in: [...clientsByStaff.keys()] }, active: true, role: { in: [...TEAM_ROLES] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  if (people.length === 0) return [];

  const jobIds = clients.flatMap((client) => client.auditJobs.map((job) => job.id));
  const staffIds = people.map((person) => person.id);
  const week = weekInMyt(now);

  const [hours, checkIns, utilisation, leave] = await Promise.all([
    db.timesheetEntry.groupBy({
      by: ["staffId"],
      where: { staffId: { in: staffIds }, jobId: { in: jobIds }, date: { gte: week.start, lt: week.end } },
      _sum: { hours: true },
    }),
    db.jobCheckIn.groupBy({
      by: ["staffId"],
      where: { staffId: { in: staffIds }, jobId: { in: jobIds } },
      _max: { createdAt: true },
    }),
    monthToDateUtilisation(staffIds, now),
    db.leaveEntry.findMany({
      where: { staffId: { in: staffIds }, date: { gte: week.start, lt: week.end } },
      orderBy: { date: "asc" },
      select: { staffId: true, date: true, hours: true },
    }),
  ]);
  const hoursByStaff = new Map(hours.map((row) => [row.staffId, Number(row._sum.hours ?? 0)]));
  const checkInByStaff = new Map(checkIns.map((row) => [row.staffId, row._max.createdAt]));

  return people.map((person) => {
    const shared = [...(clientsByStaff.get(person.id)?.values() ?? [])];
    shared.sort((a, b) => a.name.localeCompare(b.name));
    return {
      ...person,
      clients: shared.map(({ id, name }) => ({ id, name })),
      jobs: shared.reduce((sum, client) => sum + client.auditJobs.length, 0),
      hoursThisWeek: hoursByStaff.get(person.id) ?? 0,
      lastCheckIn: checkInByStaff.get(person.id) ?? null,
      // Firm-wide billable hours, not only those on the Manager's clients.
      utilisation: utilisation.get(person.id)!,
      leaveThisWeek: leave
        .filter((row) => row.staffId === person.id)
        .map((row) => ({ date: row.date, hours: Number(row.hours) })),
    };
  });
}
