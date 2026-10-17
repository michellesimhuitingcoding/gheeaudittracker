import type { AuditStage, NotificationKind, Role } from "@/generated/prisma/enums";
import { stageWorker } from "@/lib/jobs/stages";

export type NotificationTab = "ACTION_REQUIRED" | "FYI";

export const TAB_LABELS: Record<NotificationTab, string> = {
  ACTION_REQUIRED: "Action Required",
  FYI: "FYI",
};

export const KINDS_BY_TAB: Record<NotificationTab, NotificationKind[]> = {
  ACTION_REQUIRED: ["YOUR_TURN", "NO_UPDATE_MANAGER", "NO_UPDATE_PARTNER"],
  FYI: ["STAGE_CHANGED"],
};

export type JobPeople = {
  managerId: string | null;
  partnerId: string | null;
  seniorId: string | null;
  signingPartnerIds: string[];
  assignedStaff: { staffId: string; role: Role }[];
};

// Only the people whose turn it is at `stage`. Junior/Senior work goes to the
// client's Senior, or to assigned Juniors/Seniors when there is no Senior.
export function turnRecipients(stage: AuditStage | null, people: JobPeople): string[] {
  const worker = stageWorker(stage);
  let ids: (string | null)[] = [];
  if (worker === "MANAGER") ids = [people.managerId];
  if (worker === "PARTNER") ids = [people.partnerId, ...people.signingPartnerIds];
  if (worker === "STAFF") {
    ids = people.seniorId
      ? [people.seniorId]
      : people.assignedStaff.filter((row) => row.role === "JUNIOR" || row.role === "SENIOR").map((row) => row.staffId);
  }
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export type ClientGroup<T> = { clientId: string; clientName: string; items: T[] };

// Groups by client; clients appear in the order of their first item.
export function groupByClient<T extends { clientId: string; clientName: string }>(items: readonly T[]): ClientGroup<T>[] {
  const groups = new Map<string, ClientGroup<T>>();
  for (const item of items) {
    const group = groups.get(item.clientId) ?? { clientId: item.clientId, clientName: item.clientName, items: [] };
    group.items.push(item);
    groups.set(item.clientId, group);
  }
  return [...groups.values()];
}
