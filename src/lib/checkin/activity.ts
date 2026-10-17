import type { Role } from "@/generated/prisma/enums";
import { todayInMyt } from "@/lib/format";

// WORKFLOW.md §8 alert thresholds. Fixed until the Settings page exists.
export const MANAGER_ALERT_DAYS = 7;
export const PARTNER_ALERT_DAYS = 21;
const YELLOW_FROM_DAYS = 3;

// WORKFLOW.md §4: the people who work on audit jobs check in.
export const CHECK_IN_ROLES: readonly Role[] = ["JUNIOR", "SENIOR", "MANAGER", "PARTNER"];

export function canCheckIn(role: Role): boolean {
  return CHECK_IN_ROLES.includes(role);
}

// Whole calendar days (MYT) between `then` and `now`.
export function daysSince(then: Date, now = new Date()): number {
  const day = (date: Date) => Date.parse(todayInMyt(date));
  return Math.max(0, Math.round((day(now) - day(then)) / 86_400_000));
}

export type ActivityBadge = "green" | "yellow" | "red";

// Green today, nothing for 1–2 days, yellow 3–6, red 7+.
export function activityBadge(days: number): ActivityBadge | null {
  if (days === 0) return "green";
  if (days < YELLOW_FROM_DAYS) return null;
  if (days < MANAGER_ALERT_DAYS) return "yellow";
  return "red";
}

export type ActivityAlert = "MANAGER" | "PARTNER";

export function activityAlert(days: number): ActivityAlert | null {
  if (days >= PARTNER_ALERT_DAYS) return "PARTNER";
  if (days >= MANAGER_ALERT_DAYS) return "MANAGER";
  return null;
}

// Latest of job creation, check-ins and stage changes.
export function lastActivity(dates: readonly (Date | null | undefined)[]): Date | null {
  let latest: Date | null = null;
  for (const date of dates) {
    if (date && (!latest || date > latest)) latest = date;
  }
  return latest;
}
