import { describe, expect, it, vi } from "vitest";
import { assertRole, ForbiddenError } from "@/lib/permissions";

let currentRole = "JUNIOR";
const createClient = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/clients/service", () => ({ createClient }));
vi.mock("@/lib/current-staff", () => ({
  requireStaff: vi.fn(async (allowed?: readonly string[]) => {
    if (allowed) assertRole(currentRole as never, allowed as never);
    return { id: "actor", role: currentRole };
  }),
}));

const { createClientAction } = await import("@/app/clients/actions");

describe("createClientAction", () => {
  it.each(["JUNIOR", "SENIOR", "MANAGER", "PARTNER", "SECRETARIAL"])("blocks %s on the server", async (role) => {
    currentRole = role;
    await expect(createClientAction(null, new FormData())).rejects.toThrow(ForbiddenError);
    expect(createClient).not.toHaveBeenCalled();
  });
});
