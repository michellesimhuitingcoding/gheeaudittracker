import { Role } from "@/generated/prisma/enums";

export const ROLE_LABELS: Record<Role, string> = {
  JUNIOR: "Junior",
  SENIOR: "Senior",
  MANAGER: "Manager",
  PARTNER: "Partner",
  ADMIN: "Admin",
  AUDIT_ADMIN_ASSISTANT: "Audit Admin Assistant",
  AUDIT_ADMIN_MANAGER: "Audit Admin Manager",
  SECRETARIAL: "Secretarial",
  SECRETARIAL_ASSISTANT: "Secretarial Assistant",
  MASTER_ADMIN: "Master Admin",
};

export const ROLES = Object.values(Role);

// WORKFLOW.md §9: who can open the full audit log.
export const VIEW_AUDIT_LOG: readonly Role[] = ["MASTER_ADMIN", "PARTNER", "MANAGER"];
