import type { Prisma } from "@/generated/prisma/client";

export const AUDIT_ACTIONS = {
  STAFF_CREATED: "Added staff",
  STAFF_UPDATED: "Changed staff details",
  STAFF_DEACTIVATED: "Deactivated staff",
  STAFF_REACTIVATED: "Reactivated staff",
  STAFF_PASSWORD_RESET: "Reset staff password",
  CLIENT_CREATED: "Added client",
  CLIENT_UPDATED: "Changed client details",
  EXTERNAL_AUDITOR_ADDED: "Added external auditor",
  EXTERNAL_AUDITOR_UPDATED: "Changed external auditor",
  EXTERNAL_AUDITOR_REMOVED: "Removed external auditor",
  AUDIT_JOB_CREATED: "Created audit job",
  AUDIT_STAGE_CHANGED: "Moved audit stage",
  PRE_AUDIT_DEADLINE_CONFIRMED: "Confirmed pre-audit deadline",
  TIMESHEET_ENTRY_ADDED: "Logged time",
  TIMESHEET_ENTRY_UPDATED: "Changed logged time",
  TIMESHEET_ENTRY_REMOVED: "Removed logged time",
  JOB_CHECKED_IN: "Checked in to job",
  HOURLY_RATE_CHANGED: "Changed hourly rate",
  JOB_BUDGET_CHANGED: "Changed job budget",
  PUBLIC_HOLIDAY_ADDED: "Added public holiday",
  PUBLIC_HOLIDAY_REMOVED: "Removed public holiday",
  LOGIN_SUCCEEDED: "Logged in",
  LOGIN_FAILED: "Failed login",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export function isAuditAction(value: unknown): value is AuditAction {
  return typeof value === "string" && Object.hasOwn(AUDIT_ACTIONS, value);
}

export type FieldChanges = Record<string, { from: unknown; to: unknown }>;

// Fields that differ between before and after, limited to `fields`.
export function diffFields<T extends object>(before: T, after: Partial<T>, fields: readonly (keyof T)[]): FieldChanges {
  const changes: FieldChanges = {};
  for (const field of fields) {
    if (!(field in after)) continue;
    if (before[field] !== after[field]) {
      changes[String(field)] = { from: before[field], to: after[field] };
    }
  }
  return changes;
}

type AuditWriter = Pick<Prisma.TransactionClient, "auditLog">;

export function recordAudit(
  client: AuditWriter,
  entry: {
    action: AuditAction;
    actorId?: string | null;
    entityType?: string;
    entityId?: string;
    // Plain values only (strings, numbers, booleans, null).
    changes?: Record<string, unknown>;
    detail?: string;
  },
) {
  const { changes, ...rest } = entry;
  return client.auditLog.create({
    data: { ...rest, changes: changes as Prisma.InputJsonValue | undefined },
  });
}
