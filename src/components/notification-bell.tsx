import Link from "next/link";
import { requireStaff } from "@/lib/current-staff";
import { openCounts } from "@/lib/notifications/service";
import { openResetRequestCount } from "@/lib/password-reset/service";

// Empty bell when nothing needs attention; otherwise the open count.
export async function NotificationBell() {
  const viewer = await requireStaff();
  const [counts, resetRequests] = await Promise.all([openCounts(viewer.id), openResetRequestCount(viewer.role)]);
  const actionRequired = counts.ACTION_REQUIRED + resetRequests;
  const total = actionRequired + counts.FYI;
  const tab = actionRequired === 0 && counts.FYI > 0 ? "?tab=fyi" : "";

  return (
    <Link
      href={`/notifications${tab}`}
      aria-label={total > 0 ? `Notifications: ${total} open` : "Notifications: nothing needs attention"}
      className="relative inline-flex text-zinc-700"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {total > 0 && (
        <span
          className={`absolute -right-2 -top-1 rounded-full px-1.5 text-xs font-medium text-white ${
            actionRequired > 0 ? "bg-red-600" : "bg-zinc-500"
          }`}
        >
          {total}
        </span>
      )}
    </Link>
  );
}
