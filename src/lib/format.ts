import { ROLE_LABELS } from "@/lib/roles";

const dateTime = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

const FIELD_LABELS: Record<string, string> = {
  staffId: "Staff ID",
  name: "Name",
  email: "Email",
  role: "Role",
  active: "Status",
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
