import { describe, expect, it } from "vitest";
import { canSetJobBudget } from "@/lib/timecost/permissions";

describe("canSetJobBudget", () => {
  const client = { managerId: "m1", partnerId: "p1" };

  it("allows the client's Manager or Partner", () => {
    expect(canSetJobBudget({ id: "m1", role: "MANAGER" }, client)).toBe(true);
    expect(canSetJobBudget({ id: "p1", role: "PARTNER" }, client)).toBe(true);
  });

  it("blocks other Managers and Admin", () => {
    expect(canSetJobBudget({ id: "m2", role: "MANAGER" }, client)).toBe(false);
    expect(canSetJobBudget({ id: "m1", role: "ADMIN" }, client)).toBe(false);
  });
});
