import { describe, expect, it } from "vitest";
import { assertRole, ForbiddenError, hasRole } from "@/lib/permissions";

describe("permissions", () => {
  it("allows a listed role", () => {
    expect(hasRole("PARTNER", ["PARTNER"])).toBe(true);
    expect(() => assertRole("PARTNER", ["PARTNER"])).not.toThrow();
  });

  it("denies a role that is not listed", () => {
    expect(hasRole("JUNIOR", ["PARTNER", "MANAGER"])).toBe(false);
    expect(() => assertRole("JUNIOR", ["PARTNER", "MANAGER"])).toThrow(ForbiddenError);
  });

  it("denies everyone when no roles are allowed", () => {
    expect(hasRole("MASTER_ADMIN", [])).toBe(false);
  });
});
