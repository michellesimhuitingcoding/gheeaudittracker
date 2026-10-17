import type { Role } from "@/generated/prisma/enums";

type StaffState = { id: string; role: Role; active: boolean };

// Rules that stop the firm losing its last Master Admin or an admin locking
// themselves out. Returns an error message, or null if the change is allowed.
export function checkStaffChange(args: {
  actorId: string;
  before: StaffState;
  after: Pick<StaffState, "role" | "active">;
  activeMasterAdminCount: number;
}): string | null {
  const { actorId, before, after, activeMasterAdminCount } = args;
  const isSelf = actorId === before.id;

  if (isSelf && !after.active) return "You cannot deactivate your own account.";
  if (isSelf && before.role === "MASTER_ADMIN" && after.role !== "MASTER_ADMIN") {
    return "You cannot remove your own Master Admin role.";
  }

  const wasActiveMasterAdmin = before.active && before.role === "MASTER_ADMIN";
  const staysActiveMasterAdmin = after.active && after.role === "MASTER_ADMIN";
  if (wasActiveMasterAdmin && !staysActiveMasterAdmin && activeMasterAdminCount <= 1) {
    return "There must always be at least one active Master Admin.";
  }

  return null;
}
