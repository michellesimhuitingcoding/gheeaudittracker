import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/db", () => ({ db: {} }));
const { uniqueConflict } = await import("@/lib/staff-service");

function p2002(meta: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta,
  });
}

describe("uniqueConflict", () => {
  it("maps a duplicate staff ID to the staffId field", () => {
    expect(uniqueConflict(p2002({ target: ["staffId"] }))).toEqual({
      ok: false,
      fieldErrors: { staffId: ["This staff ID is already used."] },
    });
  });

  it("maps a duplicate email to the email field", () => {
    expect(
      uniqueConflict(p2002({ driverAdapterError: { cause: { constraint: { fields: ["email"] } } } })),
    ).toEqual({ ok: false, fieldErrors: { email: ["This email is already used."] } });
  });

  it("ignores other errors", () => {
    expect(uniqueConflict(new Error("boom"))).toBeNull();
  });
});
