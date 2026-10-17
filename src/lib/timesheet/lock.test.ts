import { describe, expect, it } from "vitest";
import { canAdvanceLock, nextLock } from "@/lib/timesheet/lock";

describe("nextLock", () => {
  it("moves Open → Reviewed → Billed and stops", () => {
    expect(nextLock("OPEN")).toBe("REVIEWED");
    expect(nextLock("REVIEWED")).toBe("BILLED");
    expect(nextLock("BILLED")).toBeNull();
  });
});

describe("canAdvanceLock", () => {
  const client = { managerId: "m1", partnerId: "p1" };

  it("lets only the client's Manager or Partner mark Reviewed", () => {
    expect(canAdvanceLock({ id: "m1", role: "MANAGER" }, client, "REVIEWED")).toBe(true);
    expect(canAdvanceLock({ id: "p1", role: "PARTNER" }, client, "REVIEWED")).toBe(true);
    expect(canAdvanceLock({ id: "m2", role: "MANAGER" }, client, "REVIEWED")).toBe(false);
    expect(canAdvanceLock({ id: "a1", role: "ADMIN" }, client, "REVIEWED")).toBe(false);
    expect(canAdvanceLock({ id: "s1", role: "SENIOR" }, client, "REVIEWED")).toBe(false);
  });

  it("lets the client's Manager or Partner, or any Admin, mark Billed", () => {
    expect(canAdvanceLock({ id: "m1", role: "MANAGER" }, client, "BILLED")).toBe(true);
    expect(canAdvanceLock({ id: "p1", role: "PARTNER" }, client, "BILLED")).toBe(true);
    expect(canAdvanceLock({ id: "a1", role: "ADMIN" }, client, "BILLED")).toBe(true);
    expect(canAdvanceLock({ id: "p2", role: "PARTNER" }, client, "BILLED")).toBe(false);
    expect(canAdvanceLock({ id: "x", role: "MASTER_ADMIN" }, client, "BILLED")).toBe(false);
  });

  it("never allows moving back to Open", () => {
    expect(canAdvanceLock({ id: "m1", role: "MANAGER" }, client, "OPEN")).toBe(false);
  });
});
