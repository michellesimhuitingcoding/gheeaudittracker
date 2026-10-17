import { todayInMyt } from "@/lib/format";

// The current Monday–Sunday week in Malaysia, as the UTC-midnight dates that
// timesheet `date` columns hold. `end` is exclusive (the next Monday).
export function weekInMyt(now = new Date()): { start: Date; end: Date } {
  const today = new Date(`${todayInMyt(now)}T00:00:00Z`);
  const sinceMonday = (today.getUTCDay() + 6) % 7;
  const start = new Date(today.getTime() - sinceMonday * 86_400_000);
  return { start, end: new Date(start.getTime() + 7 * 86_400_000) };
}
