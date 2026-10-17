import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { AUDIT_ACTIONS, isAuditAction } from "@/lib/audit";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { describeChanges, formatDateTime } from "@/lib/format";
import { hasRole } from "@/lib/permissions";
import { VIEW_AUDIT_LOG } from "@/lib/roles";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

type Search = { actor?: string | string[]; action?: string | string[]; page?: string | string[] };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(search: { actor?: string; action?: string }, page: number) {
  const params = new URLSearchParams();
  if (search.actor) params.set("actor", search.actor);
  if (search.action) params.set("action", search.action);
  params.set("page", String(page));
  return `/audit?${params}`;
}

async function AuditLog({ searchParams }: { searchParams: Promise<Search> }) {
  const viewer = await requireStaff();
  if (!hasRole(viewer.role, VIEW_AUDIT_LOG)) return <NoPermission />;

  const raw = await searchParams;
  const actor = first(raw.actor) || undefined;
  const actionParam = first(raw.action);
  const action = isAuditAction(actionParam) ? actionParam : undefined;
  const page = Math.max(1, Number.parseInt(first(raw.page) ?? "1", 10) || 1);

  const [staff, entries] = await Promise.all([
    db.staff.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.auditLog.findMany({
      where: { actorId: actor, action },
      orderBy: [{ at: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  const hasOlder = entries.length > PAGE_SIZE;
  const names = new Map(staff.map((member) => [member.id, member.name]));
  const clientIds = [...new Set(entries.filter((entry) => entry.entityType === "Client").map((entry) => entry.entityId))];
  const clients = await db.client.findMany({
    where: { id: { in: clientIds.filter((id): id is string => Boolean(id)) } },
    select: { id: true, name: true },
  });
  const clientNames = new Map(clients.map((client) => [client.id, client.name]));
  const recordName = (entityType: string | null, entityId: string | null) => {
    if (!entityId) return "—";
    if (entityType === "Staff") return names.get(entityId) ?? "—";
    if (entityType === "Client") return clientNames.get(entityId) ?? "—";
    return "—";
  };

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1 text-zinc-700">
          Person
          <select name="actor" defaultValue={actor ?? ""} className="rounded border border-zinc-300 px-3 py-2 text-zinc-900">
            <option value="">Everyone</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-zinc-700">
          Action
          <select name="action" defaultValue={action ?? ""} className="rounded border border-zinc-300 px-3 py-2 text-zinc-900">
            <option value="">All actions</option>
            {Object.entries(AUDIT_ACTIONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-zinc-900 px-4 py-2 font-medium text-white">
          Filter
        </button>
      </form>

      <table className="w-full max-w-6xl border-collapse bg-white text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            <th className="p-3 font-medium">When (MYT)</th>
            <th className="p-3 font-medium">Who</th>
            <th className="p-3 font-medium">Action</th>
            <th className="p-3 font-medium">Record</th>
            <th className="p-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, PAGE_SIZE).map((entry) => (
            <tr key={entry.id} className="border-b border-zinc-100 align-top text-zinc-900">
              <td className="whitespace-nowrap p-3">{formatDateTime(entry.at)}</td>
              <td className="p-3">{entry.actor?.name ?? "—"}</td>
              <td className="p-3">{isAuditAction(entry.action) ? AUDIT_ACTIONS[entry.action] : entry.action}</td>
              <td className="p-3">
                {recordName(entry.entityType, entry.entityId)}
              </td>
              <td className="p-3">
                {describeChanges(entry.changes).map((line) => (
                  <div key={line}>{line}</div>
                ))}
                {entry.detail && <div>{entry.detail}</div>}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="p-3 text-zinc-600">
                No entries.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <nav className="flex gap-4 text-sm">
        {page > 1 && (
          <Link href={pageHref({ actor, action }, page - 1)} className="underline">
            Newer
          </Link>
        )}
        {hasOlder && (
          <Link href={pageHref({ actor, action }, page + 1)} className="underline">
            Older
          </Link>
        )}
      </nav>
    </div>
  );
}

export default function AuditPage({ searchParams }: PageProps<"/audit">) {
  return (
    <PageShell title="Audit log" back="/">
      <Suspense fallback={null}>
        <AuditLog searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
