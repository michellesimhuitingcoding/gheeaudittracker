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
import { formatDate, isoDate } from "@/lib/deadlines";
import { formatDateTime, todayInMyt } from "@/lib/format";
import { canConfirmPreAuditDeadline } from "@/lib/jobs/deadline";
import { STAGES, STAGE_LABELS, checkStageMove, needsReviewNote, stageLabel } from "@/lib/jobs/stages";
import { hasRole } from "@/lib/permissions";
import { VIEW_HOURLY_RATES, canSetJobBudget } from "@/lib/timecost/permissions";
import { formatRinggit, jobTimecost } from "@/lib/timecost/timecost";
import { BILLABLE_CATEGORIES } from "@/lib/timecost/utilisation";
import { checkInAction, confirmPreAuditDeadlineAction, moveAuditStageAction, setJobBudgetAction } from "../actions";
import { CheckInButton, JobBudgetForm, PreAuditDeadlineForm, StageMoveForm } from "../job-forms";

export const metadata: Metadata = { title: "Audit job" };

async function JobDetails({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  const { id } = await params;
  const job = await db.auditJob.findUnique({
    where: { id },
    include: {
      client: { include: { signingPartners: true, assignedStaff: true } },
      preAuditDeadlineConfirmedBy: { select: { name: true } },
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
  const billable = await db.timesheetEntry.findMany({
    where: { jobId: job.id, category: { in: [...BILLABLE_CATEGORIES] } },
    select: { hours: true, staff: { select: { hourlyRate: true } } },
  });
  // Rates are live until timesheet locking freezes them (WORKFLOW.md §10).
  const timecost = jobTimecost(
    billable.map((row) => ({
      hours: Number(row.hours),
      rate: row.staff.hourlyRate === null ? null : Number(row.staff.hourlyRate),
    })),
    {
      hours: job.budgetHours === null ? null : Number(job.budgetHours),
      cost: job.budgetCost === null ? null : Number(job.budgetCost),
    },
  );
  const showCost = hasRole(viewer.role, VIEW_HOURLY_RATES);
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

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-zinc-900">Pre-audit deadline</h2>
        {job.preAuditDeadline ? (
          <p className="text-sm text-zinc-700">
            {formatDate(job.preAuditDeadline)}
            {job.preAuditDeadlineConfirmedBy && (
              <span className="text-zinc-500"> · confirmed by {job.preAuditDeadlineConfirmedBy.name}</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">Not confirmed by the Partner yet.</p>
        )}
        {canConfirmPreAuditDeadline(viewer, { partnerId: job.client.partnerId, signingPartnerIds }) && (
          <PreAuditDeadlineForm
            action={confirmPreAuditDeadlineAction.bind(null, job.id)}
            current={job.preAuditDeadline ? isoDate(job.preAuditDeadline) : null}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Budget vs actual</h2>
        <table className="w-full max-w-2xl border-collapse bg-white text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="p-3 font-medium" />
              <th className="p-3 font-medium">Budget</th>
              <th className="p-3 font-medium">Actual</th>
              <th className="p-3 font-medium">Variance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-100 text-zinc-900">
              <td className="p-3 text-zinc-600">Hours</td>
              <td className="p-3">{timecost.budgetHours ?? "—"}</td>
              <td className="p-3">{timecost.hours}</td>
              <td className="p-3">
                <Variance value={timecost.hoursVariance} format={(hours) => `${hours} h`} />
              </td>
            </tr>
            {showCost && (
              <tr className="border-b border-zinc-100 text-zinc-900">
                <td className="p-3 text-zinc-600">Timecost</td>
                <td className="p-3">{timecost.budgetCost === null ? "—" : formatRinggit(timecost.budgetCost)}</td>
                <td className="p-3">{formatRinggit(timecost.cost)}</td>
                <td className="p-3">
                  <Variance value={timecost.costVariance} format={formatRinggit} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="text-sm text-zinc-600">Actual is Work and Overtime logged to this job. Training/CPD is excluded.</p>
        {showCost && timecost.unratedHours > 0 && (
          <p className="text-sm text-amber-700">
            {timecost.unratedHours} hours are from staff with no hourly rate and are not in the timecost.
          </p>
        )}
        {canSetJobBudget(viewer, job.client) && (
          <JobBudgetForm
            action={setJobBudgetAction.bind(null, job.id)}
            budgetHours={job.budgetHours?.toString() ?? ""}
            budgetCost={job.budgetCost?.toFixed(2) ?? ""}
          />
        )}
      </section>

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

function Variance({ value, format }: { value: number | null; format: (value: number) => string }) {
  if (value === null) return <span className="text-zinc-500">No budget</span>;
  if (value > 0) return <span className="text-red-700">{format(value)} over</span>;
  if (value < 0) return <span className="text-green-700">{format(-value)} under</span>;
  return <span>On budget</span>;
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
