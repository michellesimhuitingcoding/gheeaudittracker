import type { Role } from "@/generated/prisma/enums";

// Admin and Master Admin record leave for anyone; everyone else for themselves.
export const MANAGE_ANY_LEAVE: readonly Role[] = ["ADMIN", "MASTER_ADMIN"];

export function canManageLeave(actor: { id: string; role: Role }, staffId: string): boolean {
  return actor.id === staffId || MANAGE_ANY_LEAVE.includes(actor.role);
}
