import { AuditStage, type Role } from "@/generated/prisma/enums";

export const STAGES = Object.values(AuditStage);

export const STAGE_LABELS: Record<AuditStage, string> = {
  DOCUMENTS_RECEIVED: "1. Documents received",
  PRE_AUDIT: "2. Pre-audit",
  READY: "3. Ready",
  IN_PROGRESS: "4. In progress",
  MANAGER_REVIEW: "5. Manager review",
  PARTNER_REVIEW: "6. Partner review",
  CLEAR_REVIEW: "7. Clear review",
  FINAL_REVIEW: "8. Final review",
  FINALISATION: "9. Finalisation",
};

export function stageLabel(stage: AuditStage | null): string {
  return stage ? STAGE_LABELS[stage] : "Not started";
}

export function nextStage(current: AuditStage | null): AuditStage | null {
  if (current === null) return STAGES[0];
  return STAGES[STAGES.indexOf(current) + 1] ?? null;
}

const STAFF: readonly Role[] = ["JUNIOR", "SENIOR"];
const AUDIT_ADMIN: readonly Role[] = ["AUDIT_ADMIN_ASSISTANT", "AUDIT_ADMIN_MANAGER"];

// WORKFLOW.md §4: who works each stage, and so may move a job on from it.
// Starting a job (documents received) is Audit Admin or Junior/Senior.
const MOVES_FROM: Record<AuditStage | "START", { roles: readonly Role[]; label: string }> = {
  START: { roles: [...AUDIT_ADMIN, ...STAFF], label: "Audit Admin, Junior or Senior" },
  DOCUMENTS_RECEIVED: { roles: STAFF, label: "Junior or Senior" },
  PRE_AUDIT: { roles: STAFF, label: "Junior or Senior" },
  READY: { roles: STAFF, label: "Junior or Senior" },
  IN_PROGRESS: { roles: STAFF, label: "Junior or Senior" },
  MANAGER_REVIEW: { roles: ["MANAGER"], label: "the client's Manager" },
  PARTNER_REVIEW: { roles: ["PARTNER"], label: "the client's Partner or a signing partner" },
  CLEAR_REVIEW: { roles: STAFF, label: "Junior or Senior" },
  FINAL_REVIEW: { roles: ["MANAGER"], label: "the client's Manager" },
  FINALISATION: { roles: [], label: "nobody (last stage)" },
};

// WORKFLOW.md §7: completing a review stage needs a review note.
export function needsReviewNote(current: AuditStage | null): boolean {
  return current === "MANAGER_REVIEW" || current === "PARTNER_REVIEW";
}

type Viewer = { id: string; role: Role };
type JobPeople = { managerId: string | null; partnerId: string | null; signingPartnerIds: string[] };

export type MoveCheck = { ok: true; to: AuditStage } | { ok: false; reason: string };

// Whether the viewer may move the job on to the next stage, and why not.
// Visibility of the client is checked separately.
export function checkStageMove(viewer: Viewer, current: AuditStage | null, people: JobPeople): MoveCheck {
  const to = nextStage(current);
  if (!to) return { ok: false, reason: "This audit is at the last stage." };

  const rule = MOVES_FROM[current ?? "START"];
  const reason = `Only ${rule.label} can move this job on from ${stageLabel(current)}.`;
  if (!rule.roles.includes(viewer.role)) return { ok: false, reason };
  if (current === "MANAGER_REVIEW" || current === "FINAL_REVIEW") {
    if (people.managerId !== viewer.id) return { ok: false, reason };
  }
  if (current === "PARTNER_REVIEW") {
    if (people.partnerId !== viewer.id && !people.signingPartnerIds.includes(viewer.id)) return { ok: false, reason };
  }
  return { ok: true, to };
}

export type StageWorker = "STAFF" | "MANAGER" | "PARTNER";

// Who must act while a job sits at `current` (null = not started).
export function stageWorker(current: AuditStage | null): StageWorker | null {
  if (current === "MANAGER_REVIEW" || current === "FINAL_REVIEW") return "MANAGER";
  if (current === "PARTNER_REVIEW") return "PARTNER";
  return MOVES_FROM[current ?? "START"].roles.includes("SENIOR") ? "STAFF" : null;
}
