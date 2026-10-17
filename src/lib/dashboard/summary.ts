import type { Utilisation } from "@/lib/timecost/service";
import type { JobTimecost } from "@/lib/timecost/timecost";
import { utilisationPercent } from "@/lib/timecost/utilisation";

// Deadlines falling within this many days of today count as due soon.
export const DUE_SOON_DAYS = 7;

export type Deadline = { date: Date; kind: "FORM_C" | "PRE_AUDIT"; label: string; href: string };

const DAY_MS = 86_400_000;

// Splits deadlines into overdue (before today) and due soon (today to today + 7
// days), each earliest first. Anything later is dropped.
export function splitDeadlines(
  deadlines: readonly Deadline[],
  today: Date,
): { overdue: Deadline[]; dueSoon: Deadline[] } {
  const horizon = new Date(today.getTime() + DUE_SOON_DAYS * DAY_MS);
  const sorted = [...deadlines].sort((a, b) => a.date.getTime() - b.date.getTime() || a.label.localeCompare(b.label));
  return {
    overdue: sorted.filter((deadline) => deadline.date < today),
    dueSoon: sorted.filter((deadline) => deadline.date >= today && deadline.date <= horizon),
  };
}

// Team capacity: hours logged this week and pooled month-to-date utilisation
// (total billable ÷ total available, so people are weighted by their hours).
export function teamTotals(members: readonly { hoursThisWeek: number; utilisation: Utilisation }[]): {
  people: number;
  hoursThisWeek: number;
  utilisation: Utilisation;
} {
  let hours = 0;
  let billable = 0;
  let available = 0;
  for (const member of members) {
    hours += Math.round(member.hoursThisWeek * 100);
    billable += Math.round(member.utilisation.billableHours * 100);
    available += Math.round(member.utilisation.availableHours * 100);
  }
  return {
    people: members.length,
    hoursThisWeek: hours / 100,
    utilisation: {
      billableHours: billable / 100,
      availableHours: available / 100,
      percent: utilisationPercent(billable / 100, available / 100),
    },
  };
}

export function isOverBudget(timecost: JobTimecost): boolean {
  return (timecost.hoursVariance ?? 0) > 0 || (timecost.costVariance ?? 0) > 0;
}
