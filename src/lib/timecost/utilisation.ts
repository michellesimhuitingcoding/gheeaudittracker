import type { TimesheetCategory } from "@/generated/prisma/enums";
import { todayInMyt } from "@/lib/format";

// Standard working day used for available hours.
export const STANDARD_HOURS_PER_DAY = 8;

// Billable time is job work and overtime. Training/CPD is overhead and is
// never counted in the numerator.
export const BILLABLE_CATEGORIES: readonly TimesheetCategory[] = ["WORK", "OT"];

const DAY = 86_400_000;
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

// The current month up to and including today in Malaysia, as UTC-midnight
// dates like timesheet `date` columns hold. `end` is exclusive (tomorrow).
export function monthToDateInMyt(now = new Date()): { start: Date; end: Date } {
  const today = todayInMyt(now);
  const start = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  return { start, end: new Date(new Date(`${today}T00:00:00Z`).getTime() + DAY) };
}

// A weekday that is not a public holiday (YYYY-MM-DD).
export function isWorkingDay(date: Date, holidays: ReadonlySet<string>): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(isoDate(date));
}

// Weekdays in [start, end) that are not public holidays.
export function workingDays(start: Date, end: Date, holidays: ReadonlySet<string>): number {
  let days = 0;
  for (let time = start.getTime(); time < end.getTime(); time += DAY) {
    if (isWorkingDay(new Date(time), holidays)) days += 1;
  }
  return days;
}

export function availableHours(start: Date, end: Date, holidays: ReadonlySet<string>): number {
  return workingDays(start, end, holidays) * STANDARD_HOURS_PER_DAY;
}

// Leave hours that fall on working days, at most a standard day per date.
// Leave on a weekend or public holiday is already outside available hours.
export function leaveHoursOnWorkingDays(
  entries: readonly { date: Date; hours: number }[],
  holidays: ReadonlySet<string>,
): number {
  const hundredths = entries
    .filter((entry) => isWorkingDay(entry.date, holidays))
    .reduce((sum, entry) => sum + Math.round(Math.min(entry.hours, STANDARD_HOURS_PER_DAY) * 100), 0);
  return hundredths / 100;
}

// Billable hours ÷ available hours, as a whole percentage. Null when there
// are no available hours yet (e.g. the 1st of the month is a Saturday).
export function utilisationPercent(billableHours: number, available: number): number | null {
  if (available <= 0) return null;
  return Math.round((billableHours / available) * 100);
}
