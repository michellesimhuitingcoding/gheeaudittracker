import { isWorkingDay, STANDARD_HOURS_PER_DAY } from "@/lib/timecost/utilisation";

const DAY = 86_400_000;

// Working days from `from` to `to`, both included.
export function leaveDates(from: Date, to: Date, holidays: ReadonlySet<string>): Date[] {
  const dates: Date[] = [];
  for (let time = from.getTime(); time <= to.getTime(); time += DAY) {
    const date = new Date(time);
    if (isWorkingDay(date, holidays)) dates.push(date);
  }
  return dates;
}

// "On leave" for a whole day, otherwise "On leave 4h".
export function leaveLabel(hours: number): string {
  return hours >= STANDARD_HOURS_PER_DAY ? "On leave" : `On leave ${hours}h`;
}
