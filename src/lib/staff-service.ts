import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { diffFields, recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { hashPassword } from "@/lib/password";
import { createStaffSchema, passwordSchema, staffDetailsSchema } from "@/lib/staff-schema";
import { checkStaffChange } from "@/lib/staff-rules";

const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  staffId: "This staff ID is already used.",
  email: "This email is already used.",
};

// Maps a unique-constraint error to a form field error, or null if it is not one.
export function uniqueConflict(error: unknown): FormState {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }
  const text = JSON.stringify(error.meta ?? {});
  const field = Object.keys(UNIQUE_FIELD_MESSAGES).find((name) => text.includes(name));
  if (!field) return { ok: false, error: "This record conflicts with an existing one." };
  return { ok: false, fieldErrors: { [field]: [UNIQUE_FIELD_MESSAGES[field]] } };
}

// Fields recorded in the audit trail. Never include passwordHash.
const AUDITED_FIELDS = ["staffId", "name", "email", "role"] as const;

function invalid(error: z.ZodError): FormState {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors };
}

function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createStaff(actorId: string, input: unknown): Promise<FormState> {
  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { password, ...details } = parsed.data;
  const passwordHash = await hashPassword(password);

  try {
    await db.$transaction(async (tx) => {
      const staff = await tx.staff.create({ data: { ...details, passwordHash } });
      await recordAudit(tx, {
        action: "STAFF_CREATED",
        actorId,
        entityType: "Staff",
        entityId: staff.id,
        changes: details,
      });
    });
  } catch (error) {
    const conflict = uniqueConflict(error);
    if (conflict) return conflict;
    throw error;
  }
  return { ok: true, message: `${details.name} has been added.` };
}

export async function updateStaff(actorId: string, id: string, input: unknown): Promise<FormState> {
  const parsed = staffDetailsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const details = parsed.data;

  try {
    return await serializable(async (tx) => {
      const before = await tx.staff.findUnique({ where: { id } });
      if (!before) return { ok: false, error: "Staff member not found." };

      const ruleError = checkStaffChange({
        actorId,
        before,
        after: { role: details.role, active: before.active },
        activeMasterAdminCount: await tx.staff.count({
          where: { role: "MASTER_ADMIN", active: true },
        }),
      });
      if (ruleError) return { ok: false, error: ruleError };

      const changes = diffFields(before, details, AUDITED_FIELDS);
      if (Object.keys(changes).length === 0) return { ok: true, message: "No changes to save." };

      await tx.staff.update({ where: { id }, data: details });
      await recordAudit(tx, { action: "STAFF_UPDATED", actorId, entityType: "Staff", entityId: id, changes });
      return { ok: true, message: "Changes saved." };
    });
  } catch (error) {
    const conflict = uniqueConflict(error);
    if (conflict) return conflict;
    throw error;
  }
}

export async function setStaffActive(actorId: string, id: string, active: boolean): Promise<FormState> {
  return serializable(async (tx) => {
    const before = await tx.staff.findUnique({ where: { id } });
    if (!before) return { ok: false, error: "Staff member not found." };

    const ruleError = checkStaffChange({
      actorId,
      before,
      after: { role: before.role, active },
      activeMasterAdminCount: await tx.staff.count({
        where: { role: "MASTER_ADMIN", active: true },
      }),
    });
    if (ruleError) return { ok: false, error: ruleError };

    if (before.active === active) return { ok: true, message: "No change." };

    await tx.staff.update({ where: { id }, data: { active } });
    await recordAudit(tx, {
      action: active ? "STAFF_REACTIVATED" : "STAFF_DEACTIVATED",
      actorId,
      entityType: "Staff",
      entityId: id,
      changes: { active: { from: before.active, to: active } },
    });
    return { ok: true, message: active ? "Staff member reactivated." : "Staff member deactivated." };
  });
}

export async function resetStaffPassword(actorId: string, id: string, password: unknown): Promise<FormState> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { ok: false, fieldErrors: { password: parsed.error.issues.map((issue) => issue.message) } };
  }
  const passwordHash = await hashPassword(parsed.data);

  return db.$transaction(async (tx) => {
    const result = await tx.staff.updateMany({ where: { id }, data: { passwordHash } });
    if (result.count === 0) return { ok: false, error: "Staff member not found." };
    await recordAudit(tx, { action: "STAFF_PASSWORD_RESET", actorId, entityType: "Staff", entityId: id });
    return { ok: true, message: "Password reset. Give the new password to the staff member." };
  });
}
