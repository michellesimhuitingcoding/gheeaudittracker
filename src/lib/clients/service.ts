import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { diffFields, recordAudit } from "@/lib/audit";
import {
  AUDIT_BY_LABELS,
  CLIENT_STATUS_LABELS,
  ENTITY_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  SERVICE_LABELS,
  formatFye,
} from "@/lib/clients/options";
import { canChangeOwner, canChangePaymentStatus, canEditClient } from "@/lib/clients/permissions";
import {
  clientSchema,
  externalAuditorSchema,
  type ClientInput,
  type ExternalAuditorInput,
} from "@/lib/clients/schema";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";

type Actor = { id: string; role: Role };
type Tx = Prisma.TransactionClient;
type Result = Exclude<FormState, null>;
type FieldErrors = Partial<Record<string, string[]>>;

const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  regNo: "This registration no. is already used by another client.",
  tin: "This TIN is already used by another client.",
};

function uniqueConflict(error: unknown): Result | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  const text = JSON.stringify(error.meta ?? {});
  const field = Object.keys(UNIQUE_FIELD_MESSAGES).find((name) => text.includes(name));
  if (!field) return { ok: false, error: "This client conflicts with an existing one." };
  return { ok: false, fieldErrors: { [field]: [UNIQUE_FIELD_MESSAGES[field]] } };
}

function invalid(error: z.ZodError): Result {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors };
}

function dateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

const yesNo = (value: boolean) => (value ? "Yes" : "No");

type ClientValues = Omit<ClientInput, "paymentStatus"> & { paymentStatus: keyof typeof PAYMENT_STATUS_LABELS };

// Readable snapshot of a client for the audit trail (names, not IDs).
export function clientAuditView(client: ClientValues, names: Map<string, string>) {
  const name = (id: string | null) => (id ? names.get(id) ?? id : null);
  return {
    name: client.name,
    entityType: ENTITY_TYPE_LABELS[client.entityType],
    regNo: client.regNo,
    tin: client.tin,
    fye: formatFye(client.fyeDay, client.fyeMonth),
    incorporationDate: dateOnly(client.incorporationDate),
    owner: name(client.ownerId),
    manager: name(client.managerId),
    partner: name(client.partnerId),
    services: client.services.map((service) => SERVICE_LABELS[service]).join(", "),
    dormant: yesNo(client.dormant),
    status: CLIENT_STATUS_LABELS[client.status],
    prepareFormEA: yesNo(client.prepareFormEA),
    paymentStatus: PAYMENT_STATUS_LABELS[client.paymentStatus],
    auditBy: client.auditBy ? AUDIT_BY_LABELS[client.auditBy] : null,
    signingPartners: client.signingPartnerIds
      .map((id) => name(id) ?? id)
      .sort()
      .join(", "),
    contactName: client.contactName,
    contactPhone: client.contactPhone,
    contactEmail: client.contactEmail,
    address: client.address,
  };
}

const AUDIT_VIEW_FIELDS = [
  "name",
  "entityType",
  "regNo",
  "tin",
  "fye",
  "incorporationDate",
  "owner",
  "manager",
  "partner",
  "services",
  "dormant",
  "status",
  "prepareFormEA",
  "paymentStatus",
  "auditBy",
  "signingPartners",
  "contactName",
  "contactPhone",
  "contactEmail",
  "address",
] as const satisfies readonly (keyof ReturnType<typeof clientAuditView>)[];

// Checks that people chosen for a client hold the right role and are active.
// Only people being newly set are checked, so later role changes do not block edits.
async function checkPeople(
  tx: Tx,
  input: ClientInput,
  before?: { ownerId: string; managerId: string | null; partnerId: string | null; signingPartnerIds: string[] },
): Promise<{ errors: FieldErrors; names: Map<string, string> }> {
  const ids = new Set(
    [input.ownerId, input.managerId, input.partnerId, ...input.signingPartnerIds, before?.ownerId, before?.managerId, before?.partnerId, ...(before?.signingPartnerIds ?? [])].filter(
      (id): id is string => Boolean(id),
    ),
  );
  const staff = await tx.staff.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, name: true, role: true, active: true },
  });
  const byId = new Map(staff.map((member) => [member.id, member]));
  const names = new Map(staff.map((member) => [member.id, member.name]));
  const errors: FieldErrors = {};
  const isActive = (id: string, roles: Role[]) => {
    const member = byId.get(id);
    return Boolean(member && member.active && roles.includes(member.role));
  };

  if (input.ownerId !== before?.ownerId && !isActive(input.ownerId, ["MANAGER", "PARTNER"])) {
    errors.ownerId = ["Sourced by must be an active Manager or Partner."];
  }
  if (input.managerId && input.managerId !== before?.managerId && !isActive(input.managerId, ["MANAGER"])) {
    errors.managerId = ["Manager must be an active Manager."];
  }
  if (input.partnerId && input.partnerId !== before?.partnerId && !isActive(input.partnerId, ["PARTNER"])) {
    errors.partnerId = ["Partner must be an active Partner."];
  }
  const added = input.signingPartnerIds.filter((id) => !before?.signingPartnerIds.includes(id));
  if (added.some((id) => !isActive(id, ["PARTNER"]))) {
    errors.signingPartnerIds = ["Signing partners must be active Partners."];
  }
  return { errors, names };
}

export async function createClient(actor: Actor, input: unknown): Promise<Result & { clientId?: string }> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;
  if (data.paymentStatus && data.paymentStatus !== "NOT_INVOICED" && !canChangePaymentStatus(actor)) {
    return { ok: false, error: "Only Admin can set the payment status." };
  }

  try {
    return await db.$transaction(async (tx) => {
      const { errors, names } = await checkPeople(tx, data);
      if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };

      const { signingPartnerIds, paymentStatus, ...fields } = data;
      const client = await tx.client.create({
        data: {
          ...fields,
          paymentStatus: paymentStatus ?? "NOT_INVOICED",
          signingPartners: { create: signingPartnerIds.map((partnerId) => ({ partnerId })) },
        },
      });
      await recordAudit(tx, {
        action: "CLIENT_CREATED",
        actorId: actor.id,
        entityType: "Client",
        entityId: client.id,
        changes: clientAuditView({ ...data, paymentStatus: client.paymentStatus }, names),
      });
      return { ok: true, message: `${client.name} has been added.`, clientId: client.id };
    });
  } catch (error) {
    const conflict = uniqueConflict(error);
    if (conflict) return conflict;
    throw error;
  }
}

export async function updateClient(actor: Actor, id: string, input: unknown): Promise<Result> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  try {
    return await db.$transaction(async (tx) => {
      const current = await tx.client.findUnique({ where: { id }, include: { signingPartners: true } });
      if (!current) return { ok: false, error: "Client not found." };
      if (!canEditClient(actor, current)) return { ok: false, error: "You do not have permission to edit this client." };

      if (data.ownerId !== current.ownerId && !canChangeOwner(actor)) {
        return { ok: false, fieldErrors: { ownerId: ["Sourced by is locked after intake. Ask Admin to change it."] } };
      }
      const paymentStatus = data.paymentStatus ?? current.paymentStatus;
      if (paymentStatus !== current.paymentStatus && !canChangePaymentStatus(actor)) {
        return { ok: false, fieldErrors: { paymentStatus: ["Only Admin can change the payment status."] } };
      }

      const before = { ...current, signingPartnerIds: current.signingPartners.map((row) => row.partnerId) };
      const { errors, names } = await checkPeople(tx, data, before);
      if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };

      const changes = diffFields(
        clientAuditView(before, names),
        clientAuditView({ ...data, paymentStatus }, names),
        AUDIT_VIEW_FIELDS,
      );
      if (Object.keys(changes).length === 0) return { ok: true, message: "No changes to save." };

      const { signingPartnerIds, ...fields } = data;
      await tx.client.update({
        where: { id },
        data: {
          ...fields,
          paymentStatus,
          signingPartners: {
            deleteMany: {},
            create: signingPartnerIds.map((partnerId) => ({ partnerId })),
          },
        },
      });
      await recordAudit(tx, { action: "CLIENT_UPDATED", actorId: actor.id, entityType: "Client", entityId: id, changes });
      return { ok: true, message: "Changes saved." };
    });
  } catch (error) {
    const conflict = uniqueConflict(error);
    if (conflict) return conflict;
    throw error;
  }
}

function auditorView(auditor: ExternalAuditorInput) {
  return {
    firmName: auditor.firmName,
    contact: auditor.contact,
    auditDeadline: dateOnly(auditor.auditDeadline),
    status: auditor.status,
  };
}

async function editableClient(tx: Tx, actor: Actor, clientId: string): Promise<Result | null> {
  const client = await tx.client.findUnique({
    where: { id: clientId },
    select: { ownerId: true, managerId: true, partnerId: true },
  });
  if (!client) return { ok: false, error: "Client not found." };
  if (!canEditClient(actor, client)) return { ok: false, error: "You do not have permission to edit this client." };
  return null;
}

export async function addExternalAuditor(actor: Actor, clientId: string, input: unknown): Promise<Result> {
  const parsed = externalAuditorSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    const denied = await editableClient(tx, actor, clientId);
    if (denied) return denied;
    await tx.externalAuditor.create({ data: { ...parsed.data, clientId } });
    await recordAudit(tx, {
      action: "EXTERNAL_AUDITOR_ADDED",
      actorId: actor.id,
      entityType: "Client",
      entityId: clientId,
      changes: auditorView(parsed.data),
    });
    return { ok: true, message: `${parsed.data.firmName} added.` };
  });
}

export async function updateExternalAuditor(actor: Actor, auditorId: string, input: unknown): Promise<Result> {
  const parsed = externalAuditorSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    const current = await tx.externalAuditor.findUnique({ where: { id: auditorId } });
    if (!current) return { ok: false, error: "External auditor not found." };
    const denied = await editableClient(tx, actor, current.clientId);
    if (denied) return denied;

    const changes = diffFields(auditorView(current), auditorView(parsed.data), [
      "firmName",
      "contact",
      "auditDeadline",
      "status",
    ]);
    if (Object.keys(changes).length === 0) return { ok: true, message: "No changes to save." };

    await tx.externalAuditor.update({ where: { id: auditorId }, data: parsed.data });
    await recordAudit(tx, {
      action: "EXTERNAL_AUDITOR_UPDATED",
      actorId: actor.id,
      entityType: "Client",
      entityId: current.clientId,
      changes,
      detail: current.firmName,
    });
    return { ok: true, message: "Changes saved." };
  });
}

export async function removeExternalAuditor(actor: Actor, auditorId: string): Promise<Result> {
  return db.$transaction(async (tx) => {
    const current = await tx.externalAuditor.findUnique({ where: { id: auditorId } });
    if (!current) return { ok: false, error: "External auditor not found." };
    const denied = await editableClient(tx, actor, current.clientId);
    if (denied) return denied;

    await tx.externalAuditor.delete({ where: { id: auditorId } });
    await recordAudit(tx, {
      action: "EXTERNAL_AUDITOR_REMOVED",
      actorId: actor.id,
      entityType: "Client",
      entityId: current.clientId,
      changes: auditorView(current),
    });
    return { ok: true, message: `${current.firmName} removed.` };
  });
}
