import { describe, expect, it } from "vitest";
import { diffFields, isAuditAction } from "@/lib/audit";

describe("diffFields", () => {
  const before = { name: "Aisyah", role: "JUNIOR", email: "a@example.com", passwordHash: "x" };

  it("returns only fields that changed", () => {
    expect(diffFields(before, { name: "Aisyah", role: "SENIOR" }, ["name", "role"])).toEqual({
      role: { from: "JUNIOR", to: "SENIOR" },
    });
  });

  it("ignores fields outside the list", () => {
    expect(diffFields(before, { passwordHash: "y" }, ["name", "role"])).toEqual({});
  });

  it("ignores fields missing from the update", () => {
    expect(diffFields(before, {}, ["name", "role", "email"])).toEqual({});
  });
});

describe("isAuditAction", () => {
  it("accepts known actions only", () => {
    expect(isAuditAction("STAFF_CREATED")).toBe(true);
    expect(isAuditAction("toString")).toBe(false);
    expect(isAuditAction("DROP")).toBe(false);
    expect(isAuditAction(undefined)).toBe(false);
  });
});
