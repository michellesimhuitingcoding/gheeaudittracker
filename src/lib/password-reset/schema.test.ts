import { describe, expect, it } from "vitest";
import { changePasswordSchema, forgotPasswordSchema } from "./schema";

describe("forgotPasswordSchema", () => {
  it("normalises the email", () => {
    expect(forgotPasswordSchema.parse({ email: "  Staff@Example.COM " })).toEqual({ email: "staff@example.com" });
  });

  it("rejects a non-email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const valid = { currentPassword: "temporary pass 1", password: "correct horse", confirm: "correct horse" };

  it("accepts a matching password of 12+ characters", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("requires the current password", () => {
    const result = changePasswordSchema.safeParse({ ...valid, currentPassword: "" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["currentPassword"], message: "Enter your current password." });
  });

  it("rejects a short password", () => {
    const result = changePasswordSchema.safeParse({ ...valid, password: "short", confirm: "short" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["password"], message: "Password must be at least 12 characters." });
  });

  it("rejects passwords that do not match", () => {
    const result = changePasswordSchema.safeParse({ ...valid, confirm: "correct horsf" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["confirm"], message: "The passwords do not match." });
  });
});
