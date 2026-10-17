import { ROLE_LABELS } from "@/lib/roles";

const dateTime = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

const isoDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" });

// Today's date in Malaysia as YYYY-MM-DD.
export function todayInMyt(now = new Date()): string {
  return isoDate.format(now);
}

const FIELD_LABELS: Record<string, string> = {
  staffId: "Staff ID",
  name: "Name",
  email: "Email",
  role: "Role",
  active: "Status",
  lastDay: "Last day",
  entityType: "Entity type",
  regNo: "Registration no.",
  tin: "TIN",
  fye: "FYE",
  incorporationDate: "Incorporation date",
  owner: "Sourced by",
  manager: "Manager",
  partner: "Partner",
  senior: "Senior",
  assignedStaff: "Assigned staff",
  signingPartners: "Signing partners",
  services: "Services",
  auditBy: "Audit by",
  paymentStatus: "Payment status",
  status: "Status",
  dormant: "Dormant",
  prepareFormEA: "Prepare Form EA",
  contactName: "Contact name",
  contactPhone: "Contact phone",
  contactEmail: "Contact email",
  address: "Address",
  firmName: "Firm",
  contact: "Contact",
  auditDeadline: "Audit deadline",
  year: "Financial year",
  stage: "Stage",
  hours: "Hours",
  progressNote: "Progress note",
  nextAction: "Next action",
  reviewNote: "Review note",
  preAuditDeadline: "Pre-audit deadline",
  date: "Date",
  job: "Job",
  category: "Category",
  note: "Note",
  hourlyRate: "Hourly rate",
  budgetHours: "Budget hours",
  budgetCost: "Budget cost",
  staff: "Staff",
  days: "Working days",
};

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "role" && typeof value === "string" && value in ROLE_LABELS) {
    return ROLE_LABELS[value as keyof typeof ROLE_LABELS];
  }
  if (field === "active") return value ? "Active" : "Inactive";
  return String(value);
}

function isChange(value: unknown): value is { from: unknown; to: unknown } {
  return typeof value === "object" && value !== null && "from" in value && "to" in value;
}

// Human-readable lines for an audit entry's `changes` JSON.
export function describeChanges(changes: unknown): string[] {
  if (typeof changes !== "object" || changes === null || Array.isArray(changes)) return [];
  const order = Object.keys(FIELD_LABELS);
  const rank = (field: string) => (order.includes(field) ? order.indexOf(field) : order.length);
  const entries = Object.entries(changes).sort(([a], [b]) => rank(a) - rank(b));
  return entries.map(([field, value]) => {
    const label = FIELD_LABELS[field] ?? field;
    if (isChange(value)) {
      return `${label}: ${formatValue(field, value.from)} → ${formatValue(field, value.to)}`;
    }
    return `${label}: ${formatValue(field, value)}`;
  });
}
