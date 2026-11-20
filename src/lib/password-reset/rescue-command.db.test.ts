import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const run = promisify(execFile);

async function staff(role: Role, active = true) {
  const id = randomUUID().slice(0, 8);
  return db.staff.create({
    data: { staffId: `RC-${id}`, name: `Rescue ${id}`, email: `rc-${id}@example.com`, role, active, passwordHash: "x" },
  });
}

function rescue(email: string) {
  return run("node", ["scripts/reset-master-admin-password.mjs", email], { env: { ...process.env } });
}

async function rescueFails(email: string) {
  const error = await rescue(email).then(
    () => null,
    (failure: { code: number; stderr: string }) => failure,
  );
  expect(error?.code).toBe(1);
  return error!.stderr;
}

describe("reset-master-admin-password command (database)", () => {
  it("prints a generated temporary password once and makes the Master Admin choose their own", async () => {
    const admin = await staff("MASTER_ADMIN");
    await db.passwordResetRequest.create({ data: { staffId: admin.id } });

    const { stdout } = await rescue(admin.email.toUpperCase());
    const password = stdout.match(/: (\S+)\n/)?.[1] ?? "";
    expect(password).toMatch(/^[A-Za-z2-9]{4}(-[A-Za-z2-9]{4}){3}$/);

    const updated = await db.staff.findUniqueOrThrow({ where: { id: admin.id } });
    expect(updated.mustChangePassword).toBe(true);
    expect(await verifyPassword(password, updated.passwordHash)).toBe(true);
    expect(await db.passwordResetRequest.count({ where: { staffId: admin.id, resolvedAt: null } })).toBe(0);
    expect(await db.auditLog.findFirstOrThrow({ where: { entityId: admin.id } })).toMatchObject({
      action: "STAFF_PASSWORD_RESET",
      actorId: null,
      changes: null,
      detail: "Reset by the rescue command",
    });
  });

  it("generates a different password each time", async () => {
    const admin = await staff("MASTER_ADMIN");
    const first = (await rescue(admin.email)).stdout;
    const second = (await rescue(admin.email)).stdout;
    expect(first).not.toBe(second);
  });

  it("refuses other staff, inactive Master Admins and unknown emails", async () => {
    const junior = await staff("JUNIOR");
    const inactive = await staff("MASTER_ADMIN", false);
    for (const email of [junior.email, inactive.email, "nobody@example.com"]) {
      expect(await rescueFails(email)).toContain("No active Master Admin has that email.");
    }
    expect((await db.staff.findUniqueOrThrow({ where: { id: junior.id } })).passwordHash).toBe("x");
  });

  it("asks for an email", async () => {
    expect(await rescueFails("")).toContain("Give the Master Admin's email");
  });
});
