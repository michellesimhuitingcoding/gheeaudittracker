import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import {
  eventsByDay,
  monthGrid,
  monthParam,
  monthRange,
  parseMonth,
  shiftMonth,
  type CalendarEvent,
} from "@/lib/calendar";
import { clientListFilter } from "@/lib/clients/permissions";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { formCApplies, formCDuesBetween, isoDate, todayDate } from "@/lib/deadlines";

export const metadata: Metadata = { title: "Calendar" };

const MONTH_NAMES = new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", month: "long", year: "numeric" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EVENT_STYLES: Record<CalendarEvent["kind"], string> = {
  FORM_C: "border-red-200 bg-red-50 text-red-800",
  PRE_AUDIT: "border-blue-200 bg-blue-50 text-blue-800",
};

async function Calendar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireStaff();
  const visible = clientListFilter(viewer);
  if (!visible) return <NoPermission />;

  const raw = (await searchParams).month;
  const today = todayDate();
  const month = parseMonth(Array.isArray(raw) ? raw[0] : raw, today);
  const { from, to } = monthRange(month);

  const [clients, jobs] = await Promise.all([
    db.client.findMany({
      where: { AND: [visible, { status: "ACTIVE", entityType: { in: ["SDN_BHD", "PLT"] } }] },
      select: { id: true, name: true, entityType: true, fyeDay: true, fyeMonth: true },
    }),
    db.auditJob.findMany({
      where: { client: visible, preAuditDeadline: { gte: from, lte: to } },
      select: { id: true, year: true, preAuditDeadline: true, client: { select: { name: true } } },
    }),
  ]);

  const events: CalendarEvent[] = [
    ...clients
      .filter((client) => formCApplies(client.entityType))
      .flatMap((client) =>
        formCDuesBetween(client.fyeDay, client.fyeMonth, from, to).map((date) => ({
          date,
          kind: "FORM_C" as const,
          label: `Form C · ${client.name}`,
          href: `/clients/${client.id}`,
        })),
      ),
    ...jobs.map((job) => ({
      date: job.preAuditDeadline!,
      kind: "PRE_AUDIT" as const,
      label: `Pre-audit · ${job.client.name} FY ${job.year}`,
      href: `/jobs/${job.id}`,
    })),
  ];
  const byDay = eventsByDay(events);
  const todayKey = isoDate(today);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/calendar?month=${monthParam(shiftMonth(month, -1))}`} className="text-sm underline">
          ← Previous
        </Link>
        <h2 className="text-lg font-medium text-zinc-900">{MONTH_NAMES.format(from)}</h2>
        <Link href={`/calendar?month=${monthParam(shiftMonth(month, 1))}`} className="text-sm underline">
          Next →
        </Link>
        <Link href="/calendar" className="text-sm text-zinc-600 underline">
          Today
        </Link>
        <div className="ml-auto flex gap-3 text-xs">
          <span className={`rounded border px-2 py-0.5 ${EVENT_STYLES.FORM_C}`}>Form C due (statutory)</span>
          <span className={`rounded border px-2 py-0.5 ${EVENT_STYLES.PRE_AUDIT}`}>Pre-audit deadline</span>
        </div>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-zinc-200 bg-white text-sm">
        {WEEKDAYS.map((day) => (
          <div key={day} className="border-b border-r border-zinc-200 bg-zinc-50 p-2 text-xs font-medium text-zinc-600">
            {day}
          </div>
        ))}
        {monthGrid(month)
          .flat()
          .map((day) => {
            const key = isoDate(day);
            const inMonth = day.getUTCMonth() + 1 === month.month;
            return (
              <div
                key={key}
                className={`flex min-h-28 flex-col gap-1 border-b border-r border-zinc-200 p-1.5 ${inMonth ? "" : "bg-zinc-50 text-zinc-400"}`}
              >
                <span
                  className={`self-end text-xs ${key === todayKey ? "rounded-full bg-zinc-900 px-1.5 text-white" : ""}`}
                >
                  {day.getUTCDate()}
                </span>
                {inMonth &&
                  byDay.get(key)?.map((event) => (
                    <Link
                      key={`${event.kind}-${event.href}`}
                      href={event.href}
                      className={`truncate rounded border px-1.5 py-0.5 text-xs ${EVENT_STYLES[event.kind]}`}
                      title={event.label}
                    >
                      {event.label}
                    </Link>
                  ))}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <PageShell title="Calendar" back="/">
      <Suspense fallback={null}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
