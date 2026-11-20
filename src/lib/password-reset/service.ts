import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendPasswordResetEmail, type SendPasswordResetEmail } from "./email";
import {
  forgotPasswordSchema,
  newPasswordSchema,
  RESET_DONE_MESSAGE,
  RESET_LINK_INVALID,
  RESET_REQUESTED_MESSAGE,
} from "./schema";
import {
  generateResetToken,
  hashResetToken,
  isResetTokenUsable,
  RESET_REQUEST_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
  resetLink,
} from "./token";

type RequestOptions = { baseUrl: string; now?: Date; send?: SendPasswordResetEmail };

// Always returns the same message, so the form never reveals whether an
// email belongs to an account.
export async function requestPasswordReset(email: unknown, options: RequestOptions): Promise<FormState> {
  const generic: FormState = { ok: true, message: RESET_REQUESTED_MESSAGE };
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return { ok: false, fieldErrors: { email: ["Enter a valid email address."] } };

  const now = options.now ?? new Date();
  const staff = await db.staff.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true, active: true },
  });
  if (!staff || !staff.active) return generic;

  const recent = await db.passwordResetToken.count({
    where: { staffId: staff.id, createdAt: { gt: new Date(now.getTime() - RESET_REQUEST_COOLDOWN_MS) } },
  });
  if (recent > 0) return generic;

  const { token, tokenHash } = generateResetToken();
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS);
  await db.$transaction(async (tx) => {
    // Only the newest link works.
    await tx.passwordResetToken.updateMany({ where: { staffId: staff.id, usedAt: null }, data: { usedAt: now } });
    await tx.passwordResetToken.create({ data: { staffId: staff.id, tokenHash, expiresAt, createdAt: now } });
    await recordAudit(tx, { action: "PASSWORD_RESET_REQUESTED", entityType: "Staff", entityId: staff.id });
  });

  try {
    await (options.send ?? sendPasswordResetEmail)({
      to: staff.email,
      name: staff.name,
      link: resetLink(options.baseUrl, token),
      expiresAt,
    });
  } catch (error) {
    // A failed send must look the same to the visitor as any other request.
    // eslint-disable-next-line no-console -- server log for a failed email send
    console.error("[password reset] Could not send the reset email.", error);
  }
  return generic;
}

async function findUsableToken(token: unknown, now: Date) {
  if (typeof token !== "string" || token === "") return null;
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { id: true, expiresAt: true, usedAt: true, staff: { select: { id: true, active: true, passwordHash: true } } },
  });
  if (!record || !record.staff.active || !isResetTokenUsable(record, now)) return null;
  return record;
}

export async function isResetLinkValid(token: unknown, now = new Date()): Promise<boolean> {
  return (await findUsableToken(token, now)) !== null;
}

export async function resetPasswordWithToken(token: unknown, input: unknown, now = new Date()): Promise<FormState> {
  const record = await findUsableToken(token, now);
  if (!record) return { ok: false, error: RESET_LINK_INVALID };

  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { password } = parsed.data;
  if (await verifyPassword(password, record.staff.passwordHash)) {
    return { ok: false, fieldErrors: { password: ["Choose a password different from your current one."] } };
  }
  const passwordHash = await hashPassword(password);
  const staffId = record.staff.id;

  return db.$transaction(async (tx) => {
    // Claiming the token inside the transaction makes it single-use even if
    // the form is submitted twice at once.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count === 0) return { ok: false, error: RESET_LINK_INVALID };

    await tx.staff.update({ where: { id: staffId }, data: { passwordHash } });
    await tx.passwordResetToken.updateMany({ where: { staffId, usedAt: null }, data: { usedAt: now } });
    await recordAudit(tx, {
      action: "STAFF_PASSWORD_RESET_BY_LINK",
      actorId: staffId,
      entityType: "Staff",
      entityId: staffId,
    });
    return { ok: true, message: RESET_DONE_MESSAGE };
  });
}
