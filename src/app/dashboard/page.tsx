import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { UtilisationCell } from "@/components/utilisation";
import { requireStaff } from "@/lib/current-staff";
import { type Deadline, DUE_SOON_DAYS } from "@/lib/dashboard/summary";
import { managerDashboard } from "@/lib/dashboard/service";
import { formatDate } from "@/lib/deadlines";
import { formatRinggit } from "@/lib/timecost/timecost";

export const metadata: Metadata = { title: "Manager Dashboard" };

function Tile({ label, value, href }: { label: string; value: string | number; href: string }) {
  return (
    <Link href={href} className="flex flex-col gap-1 rounded border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400">
      <span className="text-xs text-zinc-600">{label}</span>
      <span className="text-xl font-semibold text-zinc-900">{value}</span>
    </Link>
  );
}

function DeadlineList({ title, deadlines, empty }: { title: string; deadlines: Deadline[]; empty: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-zinc-900">{title}</h2>
      {deadlines.length === 0 ? (
        <p className="text-sm text-zinc-600">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm text-zinc-900">
          {deadlines.map((deadline) => (
            <li key={`${deadline.href}-${deadline.kind}-${deadline.date.toISOString()}`}>
              <span className="text-zinc-600">{formatDate(deadline.date)}</span> ·{" "}
              <Link href={deadline.href} className="underline">
                {deadline.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const variance = (value: number | null, format: (value: number) => string) =>
  value === null ? "—" : value > 0 ? `+${format(value)}` : format(value);

async function Dashboard() {
  const viewer = await requireStaff();
  if (viewer.role !== "MANAGER") return <NoPermission />;

  const { progress, team, overBudget, overdue, dueSoon } = await managerDashboard(viewer);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Workflow</h2>
        <div className="flex flex-wrap gap-3">
          <Tile label="Audit jobs" value={progress.total} href="/progress" />
          <Tile label="Waiting on you (stages 5, 8, 9)" value={progress.waitingOnManager} href="/progress" />
          <Tile label="No update for 7+ days" value={progress.stale} href="/progress" />
          <Tile label="Over budget" value={overBudget.length} href="#over-budget" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Team capacity</h2>
        <div className="flex flex-wrap gap-3">
          <Tile label="Seniors and Juniors on your clients" value={team.people} href="/team" />
          <Tile label="Team hours this week" value={team.hoursThisWeek} href="/team" />
          <Link href="/team" className="flex flex-col gap-1 rounded border border-zinc-200 bg-white px-4 py-3 text-sm hover:border-zinc-400">
            <span className="text-xs text-zinc-600">Team utilisation (month to date)</span>
            <UtilisationCell utilisation={team.utilisation} />
          </Link>
        </div>
      </section>

      <DeadlineList
        title="Overdue pre-audit deadlines"
        deadlines={overdue}
        empty="No pre-audit deadlines have passed on jobs still at or before Pre-audit."
      />
      <DeadlineList
        title={`Due in the next ${DUE_SOON_DAYS} days`}
        deadlines={dueSoon}
        empty={`No Form C or pre-audit deadlines in the next ${DUE_SOON_DAYS} days.`}
      />

      <section id="over-budget" className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Jobs over budget</h2>
        <table className="w-full max-w-6xl border-collapse bg-white text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="p-3 font-medium">Job</th>
              <th className="p-3 font-medium">Hours (budget)</th>
              <th className="p-3 font-medium">Hours variance</th>
              <th className="p-3 font-medium">Cost (budget)</th>
              <th className="p-3 font-medium">Cost variance</th>
            </tr>
          </thead>
          <tbody>
            {overBudget.map((job) => (
              <tr key={job.id} className="border-b border-zinc-100 align-top text-zinc-900">
                <td className="p-3">
                  <Link href={`/jobs/${job.id}`} className="underline">
                    {job.clientName} FY {job.year}
                  </Link>
                </td>
                <td className="p-3">
                  {job.timecost.hours} ({job.timecost.budgetHours ?? "—"})
                </td>
                <td className="p-3">{variance(job.timecost.hoursVariance, String)}</td>
                <td className="p-3">
                  {formatRinggit(job.timecost.cost)} (
                  {job.timecost.budgetCost === null ? "—" : formatRinggit(job.timecost.budgetCost)})
                </td>
                <td className="p-3">{variance(job.timecost.costVariance, formatRinggit)}</td>
              </tr>
            ))}
            {overBudget.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-zinc-600">
                  No jobs on your clients are over budget.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <PageShell title="Manager Dashboard" back="/">
      <Suspense fallback={null}>
        <Dashboard />
      </Suspense>
    </PageShell>
  );
}
