import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActivityBadge } from "@/components/activity-badge";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { lastActivity } from "@/lib/checkin/activity";
import { clientListFilter } from "@/lib/clients/permissions";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/deadlines";
import { BOARD_COLUMNS, type BoardColumnKey, boardColumns } from "@/lib/jobs/board";
import { STAGE_LABELS } from "@/lib/jobs/stages";

export const metadata: Metadata = { title: "Jobs board" };

const COLUMN_LABELS: Record<BoardColumnKey, string> = { NOT_STARTED: "Not started", ...STAGE_LABELS };

async function JobsBoard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireStaff();
  const raw = (await searchParams).show;
  const mine = viewer.role === "PARTNER" && (Array.isArray(raw) ? raw[0] : raw) === "mine";
  const visible = clientListFilter(viewer, { mine });
  if (!visible) return <NoPermission />;

  const rows = await db.auditJob.findMany({
    where: { client: visible },
    select: {
      id: true,
      year: true,
      stage: true,
      createdAt: true,
      preAuditDeadline: true,
      client: { select: { name: true, manager: { select: { name: true } } } },
      checkIns: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      stageChanges: { orderBy: { at: "desc" }, take: 1, select: { at: true } },
    },
  });
  const columns = boardColumns(
    rows.map((row) => ({
      ...row,
      lastActivity: lastActivity([row.createdAt, row.checkIns[0]?.createdAt, row.stageChanges[0]?.at]) ?? row.createdAt,
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <nav aria-label="View" className="flex items-center gap-1">
          <span className="rounded bg-zinc-900 px-3 py-1.5 text-white" aria-current="page">
            Board
          </span>
          <Link href="/calendar" className="rounded border border-zinc-300 px-3 py-1.5 text-zinc-700">
            Calendar
          </Link>
          <Link href="/clients" className="rounded border border-zinc-300 px-3 py-1.5 text-zinc-700">
            Client list
          </Link>
        </nav>
        {viewer.role === "PARTNER" && (
          <nav aria-label="Show" className="flex items-center gap-1">
            <span className="mr-1 text-zinc-600">Show:</span>
            {[
              { value: false, label: "All Clients", href: "/jobs" },
              { value: true, label: "My Clients only", href: "/jobs?show=mine" },
            ].map((option) => (
              <Link
                key={option.label}
                href={option.href}
                aria-current={mine === option.value ? "page" : undefined}
                className={
                  mine === option.value
                    ? "rounded bg-zinc-900 px-3 py-1.5 text-white"
                    : "rounded border border-zinc-300 px-3 py-1.5 text-zinc-700"
                }
              >
                {option.label}
              </Link>
            ))}
          </nav>
        )}
        <span className="text-zinc-600">Open a job to move its stage.</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {BOARD_COLUMNS.map((key) => {
          const cards = columns.get(key)!;
          return (
            <section key={key} className="flex w-60 shrink-0 flex-col gap-2 rounded bg-zinc-100 p-2">
              <h2 className="flex justify-between px-1 text-sm font-medium text-zinc-700">
                <span>{COLUMN_LABELS[key]}</span>
                <span className="text-zinc-500">{cards.length}</span>
              </h2>
              {cards.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex flex-col gap-1 rounded border border-zinc-200 bg-white p-2 text-sm hover:border-zinc-400"
                >
                  <span className="font-medium text-zinc-900">{job.client.name}</span>
                  <span className="text-xs text-zinc-600">
                    FY {job.year}
                    {job.client.manager && ` · ${job.client.manager.name}`}
                  </span>
                  {job.preAuditDeadline && (
                    <span className="text-xs text-zinc-600">Pre-audit {formatDate(job.preAuditDeadline)}</span>
                  )}
                  <span>
                    <ActivityBadge lastActivity={job.lastActivity} />
                  </span>
                </Link>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function JobsBoardPage({ searchParams }: PageProps<"/jobs">) {
  return (
    <PageShell title="Jobs board" back="/">
      <Suspense fallback={null}>
        <JobsBoard searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
