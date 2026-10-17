import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActivityBadge } from "@/components/activity-badge";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { requireStaff } from "@/lib/current-staff";
import { formatDateTime } from "@/lib/format";
import { STAGES, stageLabel } from "@/lib/jobs/stages";
import { myProgress } from "@/lib/progress/service";

export const metadata: Metadata = { title: "My Progress" };

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded border border-zinc-200 bg-white px-4 py-3">
      <span className="text-xs text-zinc-600">{label}</span>
      <span className="text-xl font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

async function Progress() {
  const viewer = await requireStaff();
  if (viewer.role !== "MANAGER") return <NoPermission />;

  const now = new Date();
  const { jobs, summary } = await myProgress(viewer, now);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <Tile label="Audit jobs" value={summary.total} />
        <Tile label="Waiting on you (stages 5, 8, 9)" value={summary.waitingOnManager} />
        <Tile label="No update for 7+ days" value={summary.stale} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Jobs by stage</h2>
        <ul className="flex flex-wrap gap-2 text-xs">
          {[null, ...STAGES].map((stage) => (
            <li key={stage ?? "none"} className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-700">
              {stageLabel(stage)}: <strong>{summary.byStage.get(stage) ?? 0}</strong>
            </li>
          ))}
        </ul>
      </section>

      <table className="w-full max-w-6xl border-collapse bg-white text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            <th className="p-3 font-medium">Client</th>
            <th className="p-3 font-medium">Year</th>
            <th className="p-3 font-medium">Stage</th>
            <th className="p-3 font-medium">Activity</th>
            <th className="p-3 font-medium">Last update (MYT)</th>
            <th className="p-3 font-medium">Hours logged</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b border-zinc-100 align-top text-zinc-900">
              <td className="p-3">
                <Link href={`/clients/${job.clientId}`} className="underline">
                  {job.clientName}
                </Link>
              </td>
              <td className="p-3">
                <Link href={`/jobs/${job.id}`} className="underline">
                  FY {job.year}
                </Link>
              </td>
              <td className="p-3">{stageLabel(job.stage)}</td>
              <td className="p-3">
                <ActivityBadge lastActivity={job.lastActivity} now={now} />
              </td>
              <td className="p-3">
                {formatDateTime(job.lastActivity)}
                {job.lastUpdatedBy && <div className="text-zinc-600">Stage moved by {job.lastUpdatedBy}</div>}
              </td>
              <td className="p-3">{job.hours}</td>
            </tr>
          ))}
          {jobs.length === 0 && (
            <tr>
              <td colSpan={6} className="p-3 text-zinc-600">
                No audit jobs on your clients.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <PageShell title="My Progress" back="/">
      <Suspense fallback={null}>
        <Progress />
      </Suspense>
    </PageShell>
  );
}
