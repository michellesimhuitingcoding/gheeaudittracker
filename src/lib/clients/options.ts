import { AuditBy, ClientStatus, EntityType, PaymentStatus, Service } from "@/generated/prisma/enums";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  SDN_BHD: "Sdn Bhd",
  PLT: "PLT",
  ENTERPRISE: "Enterprise",
  PARTNERSHIP: "Partnership",
  INDIVIDUAL: "Individual",
};

export const SERVICE_LABELS: Record<Service, string> = {
  AUDIT: "Audit",
  TAX: "Tax",
  BOOKKEEPING: "Bookkeeping",
  SECRETARIAL: "Secretarial",
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  NOT_INVOICED: "Not invoiced",
};

export const AUDIT_BY_LABELS: Record<AuditBy, string> = {
  INTERNAL: "Internal",
  EXTERNAL: "External",
};

export const ENTITY_TYPES = Object.values(EntityType);
export const SERVICES = Object.values(Service);
export const CLIENT_STATUSES = Object.values(ClientStatus);
export const PAYMENT_STATUSES = Object.values(PaymentStatus);
export const AUDIT_BY_OPTIONS = Object.values(AuditBy);

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatFye(day: number, month: number): string {
  return `${day} ${MONTHS[month - 1]}`;
}

// Latest valid day for a month; Feb allows 29 since FYE recurs every year.
export function daysInMonth(month: number): number {
  return new Date(Date.UTC(2024, month, 0)).getUTCDate();
}
