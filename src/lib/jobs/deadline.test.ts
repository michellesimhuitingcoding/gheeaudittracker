import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
const { canConfirmPreAuditDeadline, preAuditDeadlineSchema } = await import("@/lib/jobs/deadline");

const people = { partnerId: "ptr", signingPartnerIds: ["sp"] };

describe("canConfirmPreAuditDeadline", () => {
  it("allows the client's Partner or a signing partner", () => {
    expect(canConfirmPreAuditDeadline({ id: "ptr", role: "PARTNER" }, people)).toBe(true);
    expect(canConfirmPreAuditDeadline({ id: "sp", role: "PARTNER" }, people)).toBe(true);
  });

  it("blocks other Partners and other roles", () => {
    expect(canConfirmPreAuditDeadline({ id: "other", role: "PARTNER" }, people)).toBe(false);
    expect(canConfirmPreAuditDeadline({ id: "ptr", role: "MANAGER" }, people)).toBe(false);
    expect(canConfirmPreAuditDeadline({ id: "x", role: "MASTER_ADMIN" }, people)).toBe(false);
  });
});

describe("preAuditDeadlineSchema", () => {
  it("accepts a real date and rejects others", () => {
    expect(preAuditDeadlineSchema.parse({ preAuditDeadline: "2026-11-30" }).preAuditDeadline.toISOString()).toBe(
      "2026-11-30T00:00:00.000Z",
    );
    expect(preAuditDeadlineSchema.safeParse({ preAuditDeadline: "2026-02-30" }).success).toBe(false);
    expect(preAuditDeadlineSchema.safeParse({ preAuditDeadline: "" }).success).toBe(false);
    expect(preAuditDeadlineSchema.safeParse({}).success).toBe(false);
  });
});
