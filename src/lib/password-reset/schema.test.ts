import { describe, expect, it } from "vitest";
import { forgotPasswordSchema, newPasswordSchema } from "./schema";

describe("forgotPasswordSchema", () => {
  it("normalises the email", () => {
    expect(forgotPasswordSchema.parse({ email: "  Staff@Example.COM " })).toEqual({ email: "staff@example.com" });
  });

  it("rejects a non-email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("accepts a matching password of 12+ characters", () => {
    expect(newPasswordSchema.safeParse({ password: "correct horse", confirm: "correct horse" }).success).toBe(true);
  });

  it("rejects a short password", () => {
    const result = newPasswordSchema.safeParse({ password: "short", confirm: "short" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["password"], message: "Password must be at least 12 characters." });
  });

  it("rejects passwords that do not match", () => {
    const result = newPasswordSchema.safeParse({ password: "correct horse", confirm: "correct horsf" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["confirm"], message: "The passwords do not match." });
  });
});
