import type { Role } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

// WORKFLOW.md §4: intake is done by Audit Admin and Admin.
export const CLIENT_INTAKE_ROLES: readonly Role[] = [
  "AUDIT_ADMIN_ASSISTANT",
  "AUDIT_ADMIN_MANAGER",
  "ADMIN",
  "MASTER_ADMIN",
];

// WORKFLOW.md §4: Admin sets the owner and handles payments.
export const CLIENT_OWNER_ROLES: readonly Role[] = ["ADMIN", "MASTER_ADMIN"];
export const PAYMENT_STATUS_ROLES: readonly Role[] = ["ADMIN", "MASTER_ADMIN"];

// Roles that see every client (Partners can narrow to "My Clients").
const SEE_ALL_CLIENTS: readonly Role[] = [
  ...CLIENT_INTAKE_ROLES,
  "PARTNER",
  "SECRETARIAL",
  "SECRETARIAL_ASSISTANT",
];

type Viewer = { id: string; role: Role };
type ClientPeople = { ownerId: string; managerId: string | null; partnerId: string | null };
type ClientTeam = ClientPeople & { seniorId: string | null; assignedStaffIds: string[] };

const isOnTeam = (viewer: Viewer, client: ClientTeam) =>
  client.seniorId === viewer.id || client.assignedStaffIds.includes(viewer.id);

export function canCreateClient(viewer: Viewer): boolean {
  return CLIENT_INTAKE_ROLES.includes(viewer.role);
}

export function canEditClient(viewer: Viewer, client: ClientPeople): boolean {
  return (
    CLIENT_INTAKE_ROLES.includes(viewer.role) ||
    client.managerId === viewer.id ||
    client.partnerId === viewer.id
  );
}

export function canViewClient(viewer: Viewer, client: ClientTeam): boolean {
  if (SEE_ALL_CLIENTS.includes(viewer.role)) return true;
  if (viewer.role === "MANAGER") return client.managerId === viewer.id || client.ownerId === viewer.id;
  if (viewer.role === "JUNIOR" || viewer.role === "SENIOR") return isOnTeam(viewer, client);
  return false;
}

export function canChangeOwner(viewer: Viewer): boolean {
  return CLIENT_OWNER_ROLES.includes(viewer.role);
}

export function canChangePaymentStatus(viewer: Viewer): boolean {
  return PAYMENT_STATUS_ROLES.includes(viewer.role);
}

// Prisma filter for the clients a viewer may list, or null if none.
// `mine` narrows a Partner to clients they partner or sourced.
export function clientListFilter(viewer: Viewer, options: { mine?: boolean } = {}): Prisma.ClientWhereInput | null {
  if (viewer.role === "PARTNER" && options.mine) {
    return { OR: [{ partnerId: viewer.id }, { ownerId: viewer.id }] };
  }
  if (SEE_ALL_CLIENTS.includes(viewer.role)) return {};
  if (viewer.role === "MANAGER") return { OR: [{ managerId: viewer.id }, { ownerId: viewer.id }] };
  if (viewer.role === "JUNIOR" || viewer.role === "SENIOR") {
    return { OR: [{ seniorId: viewer.id }, { assignedStaff: { some: { staffId: viewer.id } } }] };
  }
  return null;
}
