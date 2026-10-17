import type { Role, TimesheetLock } from "@/generated/prisma/enums";

// WORKFLOW.md §10 timesheet lock: Open → Reviewed → Billed, one way only.
export const LOCK_LABELS: Record<TimesheetLock, string> = {
  OPEN: "Open",
  REVIEWED: "Reviewed",
  BILLED: "Billed",
};

export function nextLock(current: TimesheetLock): TimesheetLock | null {
  if (current === "OPEN") return "REVIEWED";
  if (current === "REVIEWED") return "BILLED";
  return null;
}

type Viewer = { id: string; role: Role };
type ClientPeople = { managerId: string | null; partnerId: string | null };

function isClientManagerOrPartner(viewer: Viewer, client: ClientPeople): boolean {
  return (
    (viewer.role === "MANAGER" || viewer.role === "PARTNER") &&
    (client.managerId === viewer.id || client.partnerId === viewer.id)
  );
}

// Reviewed: the client's Manager or Partner. Billed: they or any Admin.
export function canAdvanceLock(viewer: Viewer, client: ClientPeople, to: TimesheetLock): boolean {
  if (to === "REVIEWED") return isClientManagerOrPartner(viewer, client);
  if (to === "BILLED") return viewer.role === "ADMIN" || isClientManagerOrPartner(viewer, client);
  return false;
}
