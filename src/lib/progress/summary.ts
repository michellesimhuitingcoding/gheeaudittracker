import type { AuditStage } from "@/generated/prisma/enums";
import { MANAGER_ALERT_DAYS } from "@/lib/checkin/activity";

// WORKFLOW.md §4: the Manager works stages 5, 8 and 9.
export const MANAGER_STAGES: readonly AuditStage[] = ["MANAGER_REVIEW", "FINAL_REVIEW", "FINALISATION"];

export type ProgressRow = { stage: AuditStage | null; days: number };

export type ProgressSummary = {
  total: number;
  byStage: Map<AuditStage | null, number>;
  waitingOnManager: number;
  stale: number;
};

export function summarise(rows: readonly ProgressRow[]): ProgressSummary {
  const byStage = new Map<AuditStage | null, number>();
  let waitingOnManager = 0;
  let stale = 0;
  for (const row of rows) {
    byStage.set(row.stage, (byStage.get(row.stage) ?? 0) + 1);
    if (row.stage && MANAGER_STAGES.includes(row.stage)) waitingOnManager++;
    if (row.days >= MANAGER_ALERT_DAYS) stale++;
  }
  return { total: rows.length, byStage, waitingOnManager, stale };
}
