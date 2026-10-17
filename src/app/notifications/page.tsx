import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { requireStaff } from "@/lib/current-staff";
import { formatDateTime } from "@/lib/format";
import { type NotificationTab, TAB_LABELS } from "@/lib/notifications/rules";
import { openCounts, openNotifications } from "@/lib/notifications/service";
import { markAllReadAction, markClientReadAction } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

const TABS: { tab: NotificationTab; param: string }[] = [
  { tab: "ACTION_REQUIRED", param: "action" },
  { tab: "FYI", param: "fyi" },
];

async function Notifications({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const viewer = await requireStaff();
  const tab: NotificationTab = (await searchParams).tab === "fyi" ? "FYI" : "ACTION_REQUIRED";
  const [counts, groups] = await Promise.all([openCounts(viewer.id), openNotifications(viewer.id, tab)]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="flex gap-2 border-b border-zinc-200 text-sm">
        {TABS.map(({ tab: value, param }) => (
          <Link
            key={value}
            href={`/notifications?tab=${param}`}
            aria-current={value === tab ? "page" : undefined}
            className={
              value === tab
                ? "-mb-px border-b-2 border-zinc-900 px-3 py-2 font-medium text-zinc-900"
                : "px-3 py-2 text-zinc-600"
            }
          >
            {TAB_LABELS[value]}
            {counts[value] > 0 && ` (${counts[value]})`}
          </Link>
        ))}
      </nav>

      {groups.length === 0 && (
        <p className="text-sm text-zinc-600">
          {tab === "ACTION_REQUIRED" ? "Nothing needs your attention." : "You're all caught up."}
        </p>
      )}

      {tab === "FYI" && groups.length > 0 && (
        <form action={markAllReadAction}>
          <button type="submit" className="text-sm text-zinc-700 underline">
            Mark all read
          </button>
        </form>
      )}

      {groups.map((group) => (
        <section key={group.clientId} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="font-medium text-zinc-900">
              <Link href={`/clients/${group.clientId}`} className="underline">
                {group.clientName}
              </Link>{" "}
              · {group.items.length} update{group.items.length === 1 ? "" : "s"}
            </h2>
            {tab === "FYI" && (
              <form action={markClientReadAction.bind(null, group.clientId)}>
                <button type="submit" className="text-xs text-zinc-600 underline">
                  Mark read
                </button>
              </form>
            )}
          </div>
          <ul className="flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200 bg-white text-sm">
            {group.items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4 p-3">
                <span className="text-zinc-900">
                  {item.jobId ? (
                    <Link href={`/jobs/${item.jobId}`} className="underline">
                      {item.message}
                    </Link>
                  ) : (
                    item.message
                  )}
                </span>
                <span className="whitespace-nowrap text-xs text-zinc-500">{formatDateTime(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  return (
    <PageShell title="Notifications" back="/">
      <Suspense fallback={null}>
        <Notifications searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
