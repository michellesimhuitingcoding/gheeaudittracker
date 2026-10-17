import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.fn();
const findUnique = vi.fn();

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { staff: { findUnique } } }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { requireStaff } = await import("@/lib/current-staff");
const { ForbiddenError } = await import("@/lib/permissions");

const manager = {
  id: "s1",
  staffId: "G001",
  name: "Aisyah",
  email: "aisyah@example.com",
  role: "MANAGER",
  active: true,
};

beforeEach(() => {
  getServerSession.mockReset();
  findUnique.mockReset();
});

describe("requireStaff", () => {
  it("sends logged-out visitors to /login", async () => {
    getServerSession.mockResolvedValue(null);
    await expect(requireStaff()).rejects.toThrow("REDIRECT /login");
  });

  it("sends deactivated staff to /login", async () => {
    getServerSession.mockResolvedValue({ staffId: "s1" });
    findUnique.mockResolvedValue({ ...manager, active: false });
    await expect(requireStaff()).rejects.toThrow("REDIRECT /login");
  });

  it("sends staff whose record no longer exists to /login", async () => {
    getServerSession.mockResolvedValue({ staffId: "gone" });
    findUnique.mockResolvedValue(null);
    await expect(requireStaff()).rejects.toThrow("REDIRECT /login");
  });

  it("returns the current staff member", async () => {
    getServerSession.mockResolvedValue({ staffId: "s1" });
    findUnique.mockResolvedValue(manager);
    await expect(requireStaff()).resolves.toEqual(manager);
  });

  it("uses the role in the database, not the session", async () => {
    getServerSession.mockResolvedValue({ staffId: "s1", role: "PARTNER" });
    findUnique.mockResolvedValue(manager);
    await expect(requireStaff(["PARTNER"])).rejects.toThrow(ForbiddenError);
  });

  it("allows a permitted role", async () => {
    getServerSession.mockResolvedValue({ staffId: "s1" });
    findUnique.mockResolvedValue(manager);
    await expect(requireStaff(["MANAGER", "PARTNER"])).resolves.toEqual(manager);
  });
});
