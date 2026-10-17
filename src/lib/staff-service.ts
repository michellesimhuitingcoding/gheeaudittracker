import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
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

function invalid(error: z.ZodError): FormState {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors };
}

function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createStaff(input: unknown): Promise<FormState> {
  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { password, ...details } = parsed.data;

  try {
    await db.staff.create({ data: { ...details, passwordHash: await hashPassword(password) } });
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

      await tx.staff.update({ where: { id }, data: details });
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

    await tx.staff.update({ where: { id }, data: { active } });
    return { ok: true, message: active ? "Staff member reactivated." : "Staff member deactivated." };
  });
}

export async function resetStaffPassword(id: string, password: unknown): Promise<FormState> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { ok: false, fieldErrors: { password: parsed.error.issues.map((issue) => issue.message) } };
  }

  const result = await db.staff.updateMany({
    where: { id },
    data: { passwordHash: await hashPassword(parsed.data) },
  });
  if (result.count === 0) return { ok: false, error: "Staff member not found." };
  return { ok: true, message: "Password reset. Give the new password to the staff member." };
}
