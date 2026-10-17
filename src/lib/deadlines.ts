import { todayInMyt } from "@/lib/format";

// Date-only values are UTC-midnight Dates throughout.

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// The client's financial year end falling in `year` (29 Feb becomes 28 Feb in non-leap years).
export function fyeDate(fyeDay: number, fyeMonth: number, year: number): Date {
  return utcDate(year, fyeMonth, Math.min(fyeDay, lastDayOfMonth(year, fyeMonth)));
}

// WORKFLOW.md §17: Form C is due 7 months after the FYE. A month-end FYE
// gives a month-end due date (31 Dec → 31 Jul, 30 Jun → 31 Jan).
export function formCDueDate(fyeDay: number, fyeMonth: number, year: number): Date {
  const fye = fyeDate(fyeDay, fyeMonth, year);
  const target = fyeMonth - 1 + 7;
  const dueYear = year + Math.floor(target / 12);
  const dueMonth = (target % 12) + 1;
  const isMonthEnd = fye.getUTCDate() === lastDayOfMonth(year, fyeMonth);
  const day = isMonthEnd ? lastDayOfMonth(dueYear, dueMonth) : Math.min(fye.getUTCDate(), lastDayOfMonth(dueYear, dueMonth));
  return utcDate(dueYear, dueMonth, day);
}

export function formCApplies(entityType: string): boolean {
  return entityType === "SDN_BHD" || entityType === "PLT";
}

// The first Form C due date on or after `today`.
export function nextFormCDue(fyeDay: number, fyeMonth: number, today: Date): Date {
  for (let year = today.getUTCFullYear() - 1; ; year += 1) {
    const due = formCDueDate(fyeDay, fyeMonth, year);
    if (due >= today) return due;
  }
}

// Form C due dates falling within [from, to] (inclusive).
export function formCDuesBetween(fyeDay: number, fyeMonth: number, from: Date, to: Date): Date[] {
  const dues: Date[] = [];
  for (let year = from.getUTCFullYear() - 1; year <= to.getUTCFullYear(); year += 1) {
    const due = formCDueDate(fyeDay, fyeMonth, year);
    if (due >= from && due <= to) dues.push(due);
  }
  return dues;
}

// Today's date in Malaysia as a date-only value.
export function todayDate(now = new Date()): Date {
  return new Date(`${todayInMyt(now)}T00:00:00Z`);
}

const shortDate = new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export function formatDate(date: Date): string {
  return shortDate.format(date);
}
