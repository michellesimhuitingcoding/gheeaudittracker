import { z } from "zod";
import { AuditBy, ClientStatus, EntityType, PaymentStatus, Service } from "@/generated/prisma/enums";
import { normaliseEmail } from "@/lib/authenticate";
import { daysInMonth } from "@/lib/clients/options";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} is too long.` })
    .optional()
    .transform((value) => (value ? value : null));

const optionalCode = (label: string) =>
  optionalText(50, label).transform((value) => (value ? value.toUpperCase().replace(/\s+/g, "") : null));

const optionalId = z
  .string()
  .optional()
  .transform((value) => (value ? value : null));

const optionalDate = (label: string) =>
  z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
      if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        ctx.addIssue({ code: "custom", message: `Enter a valid ${label}.` });
        return z.NEVER;
      }
      return date;
    });

export const clientSchema = z
  .object({
    name: z.string({ error: "Name is required." }).trim().min(1, { error: "Name is required." }).max(200),
    entityType: z.enum(EntityType, { error: "Choose an entity type." }),
    regNo: optionalCode("Registration no."),
    tin: optionalCode("TIN"),
    fyeDay: z.coerce.number({ error: "Choose the FYE day." }).int().min(1, { error: "Choose the FYE day." }).max(31),
    fyeMonth: z.coerce
      .number({ error: "Choose the FYE month." })
      .int()
      .min(1, { error: "Choose the FYE month." })
      .max(12),
    incorporationDate: optionalDate("incorporation date"),
    ownerId: z.string({ error: "Choose who sourced this client." }).min(1, { error: "Choose who sourced this client." }),
    managerId: optionalId,
    partnerId: optionalId,
    seniorId: optionalId,
    assignedStaffIds: z
      .array(z.string().min(1))
      .default([])
      .transform((ids) => [...new Set(ids)]),
    services: z.array(z.enum(Service)).min(1, { error: "Choose at least one service." }),
    dormant: z.boolean(),
    status: z.enum(ClientStatus),
    prepareFormEA: z.boolean(),
    paymentStatus: z.enum(PaymentStatus).optional(),
    auditBy: z
      .enum(AuditBy)
      .or(z.literal(""))
      .optional()
      .transform((value) => (value ? value : null)),
    signingPartnerIds: z.array(z.string().min(1)).transform((ids) => [...new Set(ids)]),
    contactName: optionalText(200, "Contact name"),
    contactPhone: optionalText(50, "Contact phone"),
    contactEmail: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : null))
      .pipe(z.email({ error: "Enter a valid email address." }).transform(normaliseEmail).nullable()),
    address: optionalText(500, "Address"),
  })
  .superRefine((client, ctx) => {
    if (client.fyeMonth >= 1 && client.fyeMonth <= 12 && client.fyeDay > daysInMonth(client.fyeMonth)) {
      ctx.addIssue({ code: "custom", path: ["fyeDay"], message: "That day does not exist in the chosen month." });
    }
    if (client.incorporationDate && client.incorporationDate > new Date()) {
      ctx.addIssue({ code: "custom", path: ["incorporationDate"], message: "Incorporation date cannot be in the future." });
    }
  });

export type ClientInput = z.infer<typeof clientSchema>;

export const externalAuditorSchema = z.object({
  firmName: z.string({ error: "Firm name is required." }).trim().min(1, { error: "Firm name is required." }).max(200),
  contact: optionalText(300, "Contact"),
  auditDeadline: optionalDate("audit deadline"),
  status: optionalText(200, "Status"),
});

export type ExternalAuditorInput = z.infer<typeof externalAuditorSchema>;

// Reads the client form into the shape clientSchema expects.
export function clientFormValues(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };
  return {
    name: text("name"),
    entityType: text("entityType"),
    regNo: text("regNo"),
    tin: text("tin"),
    fyeDay: text("fyeDay"),
    fyeMonth: text("fyeMonth"),
    incorporationDate: text("incorporationDate"),
    ownerId: text("ownerId"),
    managerId: text("managerId"),
    partnerId: text("partnerId"),
    seniorId: text("seniorId"),
    assignedStaffIds: formData.getAll("assignedStaffIds").filter((value) => typeof value === "string"),
    services: formData.getAll("services").filter((value) => typeof value === "string"),
    dormant: formData.get("dormant") === "on",
    status: text("status"),
    prepareFormEA: formData.get("prepareFormEA") === "on",
    paymentStatus: text("paymentStatus") || undefined,
    auditBy: text("auditBy"),
    signingPartnerIds: formData.getAll("signingPartnerIds").filter((value) => typeof value === "string"),
    contactName: text("contactName"),
    contactPhone: text("contactPhone"),
    contactEmail: text("contactEmail"),
    address: text("address"),
  };
}

export function externalAuditorFormValues(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };
  return {
    firmName: text("firmName"),
    contact: text("contact"),
    auditDeadline: text("auditDeadline"),
    status: text("status"),
  };
}
