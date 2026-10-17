import type { AuditStage } from "@/generated/prisma/enums";
import { STAGES } from "@/lib/jobs/stages";

export type BoardColumnKey = AuditStage | "NOT_STARTED";

export const BOARD_COLUMNS: readonly BoardColumnKey[] = ["NOT_STARTED", ...STAGES];

// WORKFLOW.md §20 Jobs Board: one column per audit stage, plus jobs not yet
// started. Cards in a column are stalest first. There is no drag-and-drop:
// stages only move through the job page, so the stage gate (§7) applies.
export function boardColumns<T extends { stage: AuditStage | null; lastActivity: Date }>(
  jobs: readonly T[],
): Map<BoardColumnKey, T[]> {
  const columns = new Map<BoardColumnKey, T[]>(BOARD_COLUMNS.map((key) => [key, []]));
  for (const job of jobs) columns.get(job.stage ?? "NOT_STARTED")!.push(job);
  for (const cards of columns.values()) cards.sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime());
  return columns;
}
