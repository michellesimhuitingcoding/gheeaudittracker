import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertRole, ForbiddenError } from "@/lib/permissions";

let currentRole = "JUNIOR";
const service = {
  createStaff: vi.fn(async () => ({ ok: true, message: "added" })),
  updateStaff: vi.fn(async () => ({ ok: true, message: "saved" })),
  setStaffActive: vi.fn(async () => ({ ok: true, message: "done" })),
  resetStaffPassword: vi.fn(async () => ({ ok: true, message: "reset" })),
};

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/staff-service", () => service);
vi.mock("@/lib/current-staff", () => ({
  requireStaff: vi.fn(async (allowed?: readonly string[]) => {
    if (allowed) assertRole(currentRole as never, allowed as never);
    return { id: "actor", role: currentRole };
  }),
}));

const actions = await import("@/app/staff/actions");
const form = new FormData();

beforeEach(() => {
  Object.values(service).forEach((fn) => fn.mockClear());
});

describe("staff actions", () => {
  it.each(["JUNIOR", "PARTNER", "ADMIN", "SECRETARIAL"])("block %s on the server", async (role) => {
    currentRole = role;
    await expect(actions.createStaffAction(null, form)).rejects.toThrow(ForbiddenError);
    await expect(actions.updateStaffAction("s1", null, form)).rejects.toThrow(ForbiddenError);
    await expect(actions.setStaffActiveAction("s1", null, form)).rejects.toThrow(ForbiddenError);
    await expect(actions.resetPasswordAction("s1", null, form)).rejects.toThrow(ForbiddenError);
    Object.values(service).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });

  it("let Master Admin through, acting as themselves", async () => {
    currentRole = "MASTER_ADMIN";
    await actions.updateStaffAction("s1", null, form);
    const deactivate = new FormData();
    deactivate.set("active", "false");
    await actions.setStaffActiveAction("s1", null, deactivate);
    await actions.createStaffAction(null, form);
    await actions.resetPasswordAction("s1", null, form);
    expect(service.createStaff).toHaveBeenCalledWith("actor", expect.any(Object));
    expect(service.resetStaffPassword).toHaveBeenCalledWith("actor", "s1", null);
    expect(service.updateStaff).toHaveBeenCalledWith("actor", "s1", expect.any(Object));
    expect(service.setStaffActive).toHaveBeenCalledWith("actor", "s1", false);
  });
});
