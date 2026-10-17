import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/lib/password";

const findUnique = vi.fn();
const create = vi.fn();
vi.mock("@/lib/db", () => ({ db: { staff: { findUnique }, auditLog: { create } } }));

const { authOptions } = await import("@/lib/auth");
const provider = authOptions.providers[0] as unknown as {
  options: { authorize: (credentials: Record<string, string>) => Promise<unknown> };
};
const authorize = provider.options.authorize;

beforeEach(async () => {
  create.mockReset();
  findUnique.mockReset();
  findUnique.mockResolvedValue({
    id: "s1",
    name: "Aisyah",
    email: "aisyah@example.com",
    role: "MANAGER",
    active: true,
    passwordHash: await hashPassword("correct horse battery"),
  });
});

describe("login audit", () => {
  it("records a successful login against the staff member", async () => {
    await authorize({ email: "aisyah@example.com", password: "correct horse battery" });
    expect(create).toHaveBeenCalledWith({
      data: { action: "LOGIN_SUCCEEDED", actorId: "s1", entityType: "Staff", entityId: "s1", changes: undefined },
    });
  });

  it("records a failed login with the attempted email and no password", async () => {
    await authorize({ email: " Aisyah@Example.com ", password: "wrong-password" });
    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({ action: "LOGIN_FAILED", detail: "aisyah@example.com" });
    expect(JSON.stringify(data)).not.toContain("wrong-password");
  });
});
