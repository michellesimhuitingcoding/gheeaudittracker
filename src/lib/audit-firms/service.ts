import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { auditFirmSchema, MANAGE_AUDIT_FIRMS } from "./schema";

type Actor = { id: string; role: Role };
type Result = Exclude<FormState, null>;

const NOT_ALLOWED: Result = { ok: false, error: "Only the Master Admin can change audit firms." };
const DUPLICATE: Result = { ok: false, fieldErrors: { name: ["An audit firm with this name already exists."] } };

function isDuplicate(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function invalid(error: z.ZodError): Result {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors };
}

// New firms are outside (external) auditors; the firm's own entry already exists.
export async function addAuditFirm(actor: Actor, input: unknown): Promise<Result> {
  if (!MANAGE_AUDIT_FIRMS.includes(actor.role)) return NOT_ALLOWED;
  const parsed = auditFirmSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name } = parsed.data;

  try {
    return await db.$transaction(async (tx) => {
      const firm = await tx.auditFirm.create({ data: { name } });
      await recordAudit(tx, {
        action: "AUDIT_FIRM_ADDED",
        actorId: actor.id,
        entityType: "AuditFirm",
        entityId: firm.id,
        changes: { name },
      });
      return { ok: true, message: `${name} added.` };
    });
  } catch (error) {
    if (isDuplicate(error)) return DUPLICATE;
    throw error;
  }
}

export async function renameAuditFirm(actor: Actor, firmId: string, input: unknown): Promise<Result> {
  if (!MANAGE_AUDIT_FIRMS.includes(actor.role)) return NOT_ALLOWED;
  const parsed = auditFirmSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name } = parsed.data;

  try {
    return await db.$transaction(async (tx) => {
      const firm = await tx.auditFirm.findUnique({ where: { id: firmId } });
      if (!firm) return { ok: false, error: "Audit firm not found." };
      if (firm.name === name) return { ok: true, message: "No changes to save." };
      await tx.auditFirm.update({ where: { id: firmId }, data: { name } });
      await recordAudit(tx, {
        action: "AUDIT_FIRM_UPDATED",
        actorId: actor.id,
        entityType: "AuditFirm",
        entityId: firmId,
        changes: { name: { from: firm.name, to: name } },
      });
      return { ok: true, message: "Name saved." };
    });
  } catch (error) {
    if (isDuplicate(error)) return DUPLICATE;
    throw error;
  }
}

// Hidden firms drop out of the "Audit by" choices; clients already using one keep it.
export async function setAuditFirmActive(actor: Actor, firmId: string, active: boolean): Promise<Result> {
  if (!MANAGE_AUDIT_FIRMS.includes(actor.role)) return NOT_ALLOWED;
  return db.$transaction(async (tx) => {
    const firm = await tx.auditFirm.findUnique({ where: { id: firmId } });
    if (!firm) return { ok: false, error: "Audit firm not found." };
    if (firm.internal && !active) return { ok: false, error: "Your own firm cannot be hidden." };
    if (firm.active === active) return { ok: true, message: "No change." };
    await tx.auditFirm.update({ where: { id: firmId }, data: { active } });
    await recordAudit(tx, {
      action: active ? "AUDIT_FIRM_SHOWN" : "AUDIT_FIRM_HIDDEN",
      actorId: actor.id,
      entityType: "AuditFirm",
      entityId: firmId,
      changes: { name: firm.name, active: { from: firm.active, to: active } },
    });
    return { ok: true, message: active ? `${firm.name} is available again.` : `${firm.name} hidden.` };
  });
}

// Choices for a client's "Audit by": active firms, plus the client's current
// firm even if it has since been hidden. The firm's own entry comes first.
export function auditFirmOptions(currentId?: string | null) {
  return db.auditFirm.findMany({
    where: { OR: [{ active: true }, ...(currentId ? [{ id: currentId }] : [])] },
    orderBy: [{ internal: "desc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

export type AuditFirmOption = Awaited<ReturnType<typeof auditFirmOptions>>[number];
