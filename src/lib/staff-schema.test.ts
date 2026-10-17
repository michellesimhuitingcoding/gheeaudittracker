import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createStaffSchema, staffDetailsSchema } from "@/lib/staff-schema";

const valid = {
  staffId: " G002 ",
  name: " Wong Mei Ling ",
  email: " Mei.Ling@Example.COM ",
  role: "SENIOR",
};

function fieldErrors(input: unknown) {
  const result = createStaffSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("staff input validation", () => {
  it("trims values and lower-cases the email", () => {
    expect(staffDetailsSchema.parse(valid)).toEqual({
      staffId: "G002",
      name: "Wong Mei Ling",
      email: "mei.ling@example.com",
      role: "SENIOR",
    });
  });

  it("requires every field", () => {
    const errors = fieldErrors({ staffId: " ", name: "", email: "", password: "" });
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "password", "role", "staffId"]);
  });

  it("rejects an invalid email", () => {
    expect(fieldErrors({ ...valid, email: "not-an-email", password: "long-enough-pass" }).email).toEqual([
      "Enter a valid email address.",
    ]);
  });

  it("rejects an unknown role", () => {
    expect(fieldErrors({ ...valid, role: "OWNER", password: "long-enough-pass" }).role).toEqual(["Choose a role."]);
  });

  it("requires passwords of at least 12 characters", () => {
    expect(fieldErrors({ ...valid, password: "short" }).password).toEqual([
      "Password must be at least 12 characters.",
    ]);
    expect(fieldErrors({ ...valid, password: "twelve-chars" })).toEqual({});
  });
});
