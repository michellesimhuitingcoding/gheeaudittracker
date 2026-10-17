import type { Role, TimesheetCategory } from "@/generated/prisma/enums";

export const CATEGORY_LABELS: Record<TimesheetCategory, string> = {
  WORK: "Work",
  OT: "Overtime",
  TRAINING_CPD: "Training/CPD",
};

const ALL_CATEGORIES: readonly TimesheetCategory[] = ["WORK", "OT", "TRAINING_CPD"];

// WORKFLOW.md §10: Junior, Senior and Manager log daily; Partner logs only OT;
// Admin, Audit Admin and Secretarial roles have no timesheet.
export function timesheetCategories(role: Role): readonly TimesheetCategory[] {
  if (role === "JUNIOR" || role === "SENIOR" || role === "MANAGER") return ALL_CATEGORIES;
  if (role === "PARTNER") return ["OT"];
  return [];
}

export function canUseTimesheet(role: Role): boolean {
  return timesheetCategories(role).length > 0;
}
