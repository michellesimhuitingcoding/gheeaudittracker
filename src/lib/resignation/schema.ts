import type { Role } from "@/generated/prisma/enums";
import { isoDate } from "@/lib/deadlines";

// Admin and Master Admin record a leaver's last day.
export const RECORD_LAST_DAY: readonly Role[] = ["ADMIN", "MASTER_ADMIN"];

// Blank clears the last day; otherwise a YYYY-MM-DD date no earlier than today.
export function parseLastDay(value: unknown, today: Date): { ok: true; lastDay: Date | null } | { ok: false; error: string } {
  const text = typeof value === "string" ? value.trim() : "";
  if (text === "") return { ok: true, lastDay: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { ok: false, error: "Choose a valid date." };
  const lastDay = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(lastDay.getTime()) || isoDate(lastDay) !== text) return { ok: false, error: "Choose a valid date." };
  if (lastDay < today) return { ok: false, error: "Last day cannot be in the past." };
  return { ok: true, lastDay };
}

// A leaver is deactivated the day after their last day.
export function hasLeft(lastDay: Date | null, today: Date): boolean {
  return lastDay !== null && lastDay < today;
}
