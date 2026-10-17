import type { Role } from "@/generated/prisma/enums";

// WORKFLOW.md §4 hourly rate visibility.
export const EDIT_HOURLY_RATES: readonly Role[] = ["ADMIN", "MASTER_ADMIN", "AUDIT_ADMIN_MANAGER"];
export const VIEW_HOURLY_RATES: readonly Role[] = [...EDIT_HOURLY_RATES, "MANAGER", "PARTNER"];

// WORKFLOW.md §4 settings edit: only the Master Admin changes firm settings.
export const MANAGE_PUBLIC_HOLIDAYS: readonly Role[] = ["MASTER_ADMIN"];

// WORKFLOW.md §10: the client's Manager or Partner sets the job budget.
export function canSetJobBudget(
  viewer: { id: string; role: Role },
  client: { managerId: string | null; partnerId: string | null },
): boolean {
  return (
    (viewer.role === "MANAGER" || viewer.role === "PARTNER") &&
    (client.managerId === viewer.id || client.partnerId === viewer.id)
  );
}
