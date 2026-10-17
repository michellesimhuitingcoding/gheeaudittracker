import { type ActivityAlert, activityAlert, activityBadge, daysSince } from "@/lib/checkin/activity";

const BADGE_CLASSES = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
} as const;

const ALERT_LABELS: Record<ActivityAlert, string> = {
  MANAGER: "Manager alert",
  PARTNER: "Partner alert",
};

// WORKFLOW.md §8: days since the last activity on a job.
export function ActivityBadge({ lastActivity, now = new Date() }: { lastActivity: Date; now?: Date }) {
  const days = daysSince(lastActivity, now);
  const badge = activityBadge(days);
  const alert = activityAlert(days);
  const text = days === 0 ? "Active today" : `${days} day${days === 1 ? "" : "s"} since update`;

  if (!badge) return <span className="text-xs text-zinc-600">{text}</span>;
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE_CLASSES[badge]}`}>
      {text}
      {alert && ` · ${ALERT_LABELS[alert]}`}
    </span>
  );
}
