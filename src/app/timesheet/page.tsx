import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { clientListFilter } from "@/lib/clients/permissions";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { todayInMyt } from "@/lib/format";
import { monthToDateUtilisation } from "@/lib/timecost/service";
import { CATEGORY_LABELS, timesheetCategories } from "@/lib/timesheet/permissions";
import { LOCK_LABELS } from "@/lib/timesheet/lock";
import { addTimesheetEntryAction, removeTimesheetEntryAction, updateTimesheetEntryAction } from "./actions";
import { EntryForm, RemoveEntryButton } from "./timesheet-forms";

export const metadata: Metadata = { title: "Timesheet" };

type Search = { date?: string | string[] };

function parseDate(value: string | string[] | undefined, today: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) return today;
  return raw > today ? today : raw;
}

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

async function Timesheet({ searchParams }: { searchParams: Promise<Search> }) {
  const viewer = await requireStaff();
  const allowed = timesheetCategories(viewer.role);
  if (allowed.length === 0) return <NoPermission />;

  const today = todayInMyt();
  const date = parseDate((await searchParams).date, today);
  const clientFilter = clientListFilter(viewer);

  const [jobs, entries, utilisation] = await Promise.all([
    clientFilter
      ? db.auditJob.findMany({
          where: { client: clientFilter, timesheetLock: "OPEN" },
          orderBy: [{ client: { name: "asc" } }, { year: "desc" }],
          select: { id: true, year: true, client: { select: { name: true } } },
        })
      : [],
    db.timesheetEntry.findMany({
      where: { staffId: viewer.id, date: new Date(`${date}T00:00:00Z`) },
      orderBy: { createdAt: "asc" },
      include: { job: { select: { year: true, timesheetLock: true, client: { select: { name: true } } } } },
    }),
    // Partners log overtime only, so utilisation does not apply to them.
    viewer.role === "PARTNER" ? null : monthToDateUtilisation([viewer.id]).then((rows) => rows.get(viewer.id)!),
  ]);
  const jobOptions = jobs.map((job) => ({ value: job.id, label: `${job.client.name} · FY ${job.year}` }));
  const categoryOptions = allowed.map((category) => ({ value: category, label: CATEGORY_LABELS[category] }));
  const total = entries.reduce((sum, entry) => sum + Math.round(Number(entry.hours) * 100), 0) / 100;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end gap-4 text-sm">
        <Link href={`/timesheet?date=${shiftDate(date, -1)}`} className="underline">
          Previous day
        </Link>
        <form className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-zinc-700">
            Date
            <input
              name="date"
              type="date"
              defaultValue={date}
              max={today}
              className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </label>
          <button type="submit" className="rounded bg-zinc-900 px-4 py-2 font-medium text-white">
            Go
          </button>
        </form>
        {date < today && (
          <Link href={`/timesheet?date=${shiftDate(date, 1)}`} className="underline">
            Next day
          </Link>
        )}
        {viewer.role === "PARTNER" && <span className="text-zinc-600">Partners log overtime only.</span>}
        {utilisation && (
          <span className="text-zinc-600">
            Utilisation this month: {utilisation.percent === null ? "—" : `${utilisation.percent}%`} (
            {utilisation.billableHours} billable of {utilisation.availableHours} available hours)
          </span>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Log time</h2>
        <EntryForm
          key={date}
          action={addTimesheetEntryAction}
          date={date}
          jobs={jobOptions}
          categories={categoryOptions}
          submitLabel="Add entry"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Entries · {total} hours</h2>
        <table className="w-full max-w-6xl border-collapse bg-white text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="p-3 font-medium">Job</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Hours</th>
              <th className="p-3 font-medium">Note</th>
              <th className="p-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-zinc-100 align-top text-zinc-900">
                <td className="p-3">{entry.job ? `${entry.job.client.name} · FY ${entry.job.year}` : "—"}</td>
                <td className="p-3">{CATEGORY_LABELS[entry.category]}</td>
                <td className="p-3">{entry.hours.toString()}</td>
                <td className="whitespace-pre-wrap p-3">{entry.note ?? "—"}</td>
                <td className="p-3">
                  {entry.job && entry.job.timesheetLock !== "OPEN" ? (
                    <span className="text-sm text-zinc-500">Locked ({LOCK_LABELS[entry.job.timesheetLock]})</span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <details>
                        <summary className="cursor-pointer text-sm underline">Edit</summary>
                        <div className="pt-3">
                          <EntryForm
                            action={updateTimesheetEntryAction.bind(null, entry.id)}
                            date={date}
                            jobs={jobOptions}
                            categories={categoryOptions}
                            defaults={{
                              category: entry.category,
                              jobId: entry.jobId ?? "",
                              hours: entry.hours.toString(),
                              note: entry.note ?? "",
                            }}
                            submitLabel="Save"
                          />
                        </div>
                      </details>
                      <RemoveEntryButton action={removeTimesheetEntryAction.bind(null, entry.id)} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-zinc-600">
                  No time logged on this day.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function TimesheetPage({ searchParams }: PageProps<"/timesheet">) {
  return (
    <PageShell title="Timesheet" back="/">
      <Suspense fallback={null}>
        <Timesheet searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
