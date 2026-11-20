import { z } from "zod";
import type { Role } from "@/generated/prisma/enums";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  HANDLE_RESET_REQUESTS,
  PASSWORD_CHANGED_MESSAGE,
  RESET_REQUESTED_MESSAGE,
} from "./schema";

// Always returns the same message, so the form never reveals whether an
// email belongs to an account. One open request per person.
export async function requestPasswordReset(email: unknown): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return { ok: false, fieldErrors: { email: ["Enter a valid email address."] } };
  const generic: FormState = { ok: true, message: RESET_REQUESTED_MESSAGE };

  const staff = await db.staff.findUnique({ where: { email: parsed.data.email }, select: { id: true, active: true } });
  if (!staff || !staff.active) return generic;

  await db.$transaction(async (tx) => {
    const open = await tx.passwordResetRequest.count({ where: { staffId: staff.id, resolvedAt: null } });
    if (open > 0) return;
    await tx.passwordResetRequest.create({ data: { staffId: staff.id } });
    await recordAudit(tx, { action: "PASSWORD_RESET_REQUESTED", entityType: "Staff", entityId: staff.id });
  });
  return generic;
}

export async function openResetRequestCount(role: Role): Promise<number> {
  if (!HANDLE_RESET_REQUESTS.includes(role)) return 0;
  return db.passwordResetRequest.count({ where: { resolvedAt: null } });
}

export async function openResetRequests(role: Role) {
  if (!HANDLE_RESET_REQUESTS.includes(role)) return [];
  return db.passwordResetRequest.findMany({
    where: { resolvedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true, staff: { select: { id: true, name: true, email: true } } },
  });
}

export async function changeOwnPassword(staffId: string, input: unknown): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { currentPassword, password } = parsed.data;

  const staff = await db.staff.findUnique({ where: { id: staffId }, select: { passwordHash: true } });
  if (!staff) return { ok: false, error: "Staff member not found." };
  if (!(await verifyPassword(currentPassword, staff.passwordHash))) {
    return { ok: false, fieldErrors: { currentPassword: ["Current password is incorrect."] } };
  }
  if (await verifyPassword(password, staff.passwordHash)) {
    return { ok: false, fieldErrors: { password: ["Choose a password different from your current one."] } };
  }
  const passwordHash = await hashPassword(password);

  await db.$transaction(async (tx) => {
    await tx.staff.update({ where: { id: staffId }, data: { passwordHash, mustChangePassword: false } });
    await recordAudit(tx, { action: "STAFF_PASSWORD_CHANGED", actorId: staffId, entityType: "Staff", entityId: staffId });
  });
  return { ok: true, message: PASSWORD_CHANGED_MESSAGE };
}
