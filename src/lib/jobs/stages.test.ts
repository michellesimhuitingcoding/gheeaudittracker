import { describe, expect, it } from "vitest";
import type { AuditStage, Role } from "@/generated/prisma/enums";
import { checkStageMove, needsReviewNote, nextStage } from "@/lib/jobs/stages";

const people = { managerId: "mgr", partnerId: "ptr", signingPartnerIds: ["sp"] };
const as = (role: Role, id = "me") => ({ id, role });
const canMove = (role: Role, from: AuditStage | null, id = "me") => checkStageMove(as(role, id), from, people).ok;

describe("nextStage", () => {
  it("walks the 9 stages in order and stops at the end", () => {
    expect(nextStage(null)).toBe("DOCUMENTS_RECEIVED");
    expect(nextStage("IN_PROGRESS")).toBe("MANAGER_REVIEW");
    expect(nextStage("FINALISATION")).toBeNull();
  });
});

describe("checkStageMove", () => {
  it("lets Audit Admin and Junior/Senior start a job, but not others", () => {
    for (const role of ["AUDIT_ADMIN_ASSISTANT", "AUDIT_ADMIN_MANAGER", "JUNIOR", "SENIOR"] as Role[]) {
      expect(canMove(role, null)).toBe(true);
    }
    for (const role of ["MANAGER", "PARTNER", "ADMIN", "SECRETARIAL"] as Role[]) {
      expect(canMove(role, null)).toBe(false);
    }
  });

  it("gives stages 1–4 and 7 to Junior/Senior only", () => {
    for (const stage of ["DOCUMENTS_RECEIVED", "PRE_AUDIT", "READY", "IN_PROGRESS", "CLEAR_REVIEW"] as AuditStage[]) {
      expect(canMove("JUNIOR", stage)).toBe(true);
      expect(canMove("SENIOR", stage)).toBe(true);
      expect(canMove("AUDIT_ADMIN_ASSISTANT", stage)).toBe(false);
      expect(canMove("MANAGER", stage, "mgr")).toBe(false);
    }
  });

  it("gives stages 5 and 8 to the client's own Manager", () => {
    for (const stage of ["MANAGER_REVIEW", "FINAL_REVIEW"] as AuditStage[]) {
      expect(canMove("MANAGER", stage, "mgr")).toBe(true);
      expect(canMove("MANAGER", stage, "other")).toBe(false);
      expect(canMove("SENIOR", stage)).toBe(false);
    }
  });

  it("gives stage 6 to the client's Partner or a signing partner", () => {
    expect(canMove("PARTNER", "PARTNER_REVIEW", "ptr")).toBe(true);
    expect(canMove("PARTNER", "PARTNER_REVIEW", "sp")).toBe(true);
    expect(canMove("PARTNER", "PARTNER_REVIEW", "other")).toBe(false);
    expect(canMove("MANAGER", "PARTNER_REVIEW", "mgr")).toBe(false);
  });

  it("explains why a move is blocked", () => {
    expect(checkStageMove(as("JUNIOR"), "MANAGER_REVIEW", people)).toEqual({
      ok: false,
      reason: "Only the client's Manager can move this job on from 5. Manager review.",
    });
    expect(checkStageMove(as("MANAGER", "mgr"), "FINALISATION", people)).toEqual({
      ok: false,
      reason: "This audit is at the last stage.",
    });
  });

  it("returns the stage the job moves to", () => {
    expect(checkStageMove(as("SENIOR"), "IN_PROGRESS", people)).toEqual({ ok: true, to: "MANAGER_REVIEW" });
  });
});

describe("needsReviewNote", () => {
  it("is required only when completing stages 5 and 6", () => {
    expect(needsReviewNote("MANAGER_REVIEW")).toBe(true);
    expect(needsReviewNote("PARTNER_REVIEW")).toBe(true);
    expect(needsReviewNote("IN_PROGRESS")).toBe(false);
    expect(needsReviewNote(null)).toBe(false);
  });
});
