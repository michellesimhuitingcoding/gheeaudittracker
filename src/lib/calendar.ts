import { isoDate, utcDate } from "@/lib/deadlines";

export type CalendarMonth = { year: number; month: number };

// Reads ?month=YYYY-MM, falling back to the month of `today`.
export function parseMonth(value: string | undefined, today: Date): CalendarMonth {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) return { year, month };
  }
  return { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1 };
}

export function shiftMonth({ year, month }: CalendarMonth, by: number): CalendarMonth {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthParam({ year, month }: CalendarMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthRange({ year, month }: CalendarMonth): { from: Date; to: Date } {
  return { from: utcDate(year, month, 1), to: new Date(Date.UTC(year, month, 0)) };
}

// Weeks (Monday first) covering the month; days outside it are included to fill each week.
export function monthGrid(calendar: CalendarMonth): Date[][] {
  const { from, to } = monthRange(calendar);
  const DAY = 24 * 60 * 60 * 1000;
  const start = from.getTime() - ((from.getUTCDay() + 6) % 7) * DAY;
  const end = to.getTime() + ((7 - to.getUTCDay()) % 7) * DAY;
  const weeks: Date[][] = [];
  for (let time = start; time <= end; time += DAY) {
    if ((time - start) % (7 * DAY) === 0) weeks.push([]);
    weeks.at(-1)!.push(new Date(time));
  }
  return weeks;
}

export type CalendarEvent = {
  date: Date;
  kind: "FORM_C" | "PRE_AUDIT";
  label: string;
  href: string;
};

export function eventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of [...events].sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label))) {
    const key = isoDate(event.date);
    byDay.set(key, [...(byDay.get(key) ?? []), event]);
  }
  return byDay;
}
