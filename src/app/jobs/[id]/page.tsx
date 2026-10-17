import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActivityBadge } from "@/components/activity-badge";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { canCheckIn, lastActivity } from "@/lib/checkin/activity";
import { canViewClient } from "@/lib/clients/permissions";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { formatDateTime, todayInMyt } from "@/lib/format";
import { STAGES, STAGE_LABELS, checkStageMove, needsReviewNote, stageLabel } from "@/lib/jobs/stages";
import { checkInAction, moveAuditStageAction } from "../actions";
import { CheckInButton, StageMoveForm } from "../job-forms";

export const metadata: Metadata = { title: "Audit job" };

async function JobDetails({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  const { id } = await params;
  const job = await db.auditJob.findUnique({
    where: { id },
    include: {
      client: { include: { signingPartners: true, assignedStaff: true } },
      stageChanges: { orderBy: { at: "desc" }, include: { by: { select: { name: true } } } },
      checkIns: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  if (!job) notFound();
  const signingPartnerIds = job.client.signingPartners.map((row) => row.partnerId);
  const assignedStaffIds = job.client.assignedStaff.map((row) => row.staffId);
  if (!canViewClient(viewer, { ...job.client, assignedStaffIds })) return <NoPermission />;

  const move = checkStageMove(viewer, job.stage, { ...job.client, signingPartnerIds });
  const currentIndex = job.stage ? STAGES.indexOf(job.stage) : -1;
  const last = job.stageChanges[0];
  const todaysCheckIns = await db.jobCheckIn.findMany({
    where: { jobId: job.id, date: new Date(todayInMyt()) },
    orderBy: { createdAt: "asc" },
    select: { staffId: true, staff: { select: { name: true } } },
  });
  const activity = lastActivity([job.createdAt, job.checkIns[0]?.createdAt, last?.at]) ?? job.createdAt;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1 text-sm text-zinc-700">
        <Link href={`/clients/${job.client.id}`} className="font-medium text-zinc-900 underline">
          {job.client.name}
        </Link>
        <span>Financial year {job.year}</span>
        <span>
          Current stage: <strong>{stageLabel(job.stage)}</strong>
        </span>
        {last && (
          <span className="text-zinc-600">
            Last updated by {last.by.name} at {formatDateTime(last.at)}
          </span>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-medium text-zinc-900">Daily check-in</h2>
          <ActivityBadge lastActivity={activity} />
        </div>
        {canCheckIn(viewer.role) && (
          <CheckInButton
            action={checkInAction.bind(null, job.id)}
            checkedIn={todaysCheckIns.some((row) => row.staffId === viewer.id)}
          />
        )}
        <p className="text-sm text-zinc-600">
          {todaysCheckIns.length > 0
            ? `Working on this today: ${todaysCheckIns.map((row) => row.staff.name).join(", ")}`
            : "No one has checked in today."}
        </p>
      </section>

      <ol className="flex flex-wrap gap-2 text-xs">
        {STAGES.map((stage, index) => (
          <li
            key={stage}
            aria-current={index === currentIndex ? "step" : undefined}
            className={
              index < currentIndex
                ? "rounded bg-zinc-200 px-2 py-1 text-zinc-700"
                : index === currentIndex
                  ? "rounded bg-zinc-900 px-2 py-1 text-white"
                  : "rounded border border-zinc-300 px-2 py-1 text-zinc-500"
            }
          >
            {STAGE_LABELS[stage]}
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Move stage</h2>
        {move.ok ? (
          <StageMoveForm
            action={moveAuditStageAction.bind(null, job.id)}
            fromStage={job.stage ?? ""}
            toLabel={STAGE_LABELS[move.to]}
            needsReviewNote={needsReviewNote(job.stage)}
          />
        ) : (
          <p className="rounded border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500">{move.reason}</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">History</h2>
        <table className="w-full max-w-6xl border-collapse bg-white text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="p-3 font-medium">When (MYT)</th>
              <th className="p-3 font-medium">Who</th>
              <th className="p-3 font-medium">Stage</th>
              <th className="p-3 font-medium">Hours</th>
              <th className="p-3 font-medium">Progress note</th>
              <th className="p-3 font-medium">Next action</th>
              <th className="p-3 font-medium">Review note</th>
            </tr>
          </thead>
          <tbody>
            {job.stageChanges.map((change) => (
              <tr key={change.id} className="border-b border-zinc-100 align-top text-zinc-900">
                <td className="whitespace-nowrap p-3">{formatDateTime(change.at)}</td>
                <td className="p-3">{change.by.name}</td>
                <td className="p-3">
                  {stageLabel(change.fromStage)} → {stageLabel(change.toStage)}
                </td>
                <td className="p-3">{change.hours.toString()}</td>
                <td className="whitespace-pre-wrap p-3">{change.progressNote}</td>
                <td className="p-3">{change.nextAction}</td>
                <td className="whitespace-pre-wrap p-3">{change.reviewNote ?? "—"}</td>
              </tr>
            ))}
            {job.stageChanges.length === 0 && (
              <tr>
                <td colSpan={7} className="p-3 text-zinc-600">
                  No stage changes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function JobPage({ params }: PageProps<"/jobs/[id]">) {
  return (
    <PageShell title="Audit job" back="/clients">
      <Suspense fallback={null}>
        <JobDetails params={params} />
      </Suspense>
    </PageShell>
  );
}
