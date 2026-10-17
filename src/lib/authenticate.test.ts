import { beforeAll, describe, expect, it, vi } from "vitest";
import { authenticate, type StaffRecord } from "@/lib/authenticate";
import { hashPassword } from "@/lib/password";

let staff: StaffRecord;

beforeAll(async () => {
  staff = {
    id: "s1",
    name: "Aisyah",
    email: "aisyah@example.com",
    role: "MANAGER",
    active: true,
    passwordHash: await hashPassword("correct horse battery"),
  };
});

function lookup(record: StaffRecord | null) {
  return vi.fn(async () => record);
}

describe("authenticate", () => {
  it("returns the staff member for the correct password", async () => {
    const result = await authenticate(
      { email: "aisyah@example.com", password: "correct horse battery" },
      lookup(staff),
    );
    expect(result).toEqual({ id: "s1", name: "Aisyah", email: "aisyah@example.com", role: "MANAGER" });
  });

  it("does not return the password hash", async () => {
    const result = await authenticate(
      { email: "aisyah@example.com", password: "correct horse battery" },
      lookup(staff),
    );
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("rejects a wrong password", async () => {
    const result = await authenticate(
      { email: "aisyah@example.com", password: "wrong" },
      lookup(staff),
    );
    expect(result).toBeNull();
  });

  it("rejects an unknown email", async () => {
    const result = await authenticate({ email: "nobody@example.com", password: "x" }, lookup(null));
    expect(result).toBeNull();
  });

  it("rejects staff who have been deactivated", async () => {
    const result = await authenticate(
      { email: "aisyah@example.com", password: "correct horse battery" },
      lookup({ ...staff, active: false }),
    );
    expect(result).toBeNull();
  });

  it("looks up the email trimmed and lower-cased", async () => {
    const find = lookup(staff);
    await authenticate({ email: "  Aisyah@Example.COM ", password: "correct horse battery" }, find);
    expect(find).toHaveBeenCalledWith("aisyah@example.com");
  });

  it.each([undefined, {}, { email: "", password: "x" }, { email: "a@b.c", password: "" }, { email: 1, password: [] }])(
    "rejects missing or malformed input %j without a lookup",
    async (credentials) => {
      const find = lookup(staff);
      expect(await authenticate(credentials, find)).toBeNull();
      expect(find).not.toHaveBeenCalled();
    },
  );
});
