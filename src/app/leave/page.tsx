import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/deadlines";
import { todayInMyt } from "@/lib/format";
import { leaveLabel } from "@/lib/leave/leave";
import { MANAGE_ANY_LEAVE } from "@/lib/leave/permissions";
import { ROLE_LABELS } from "@/lib/roles";
import { addLeaveAction, removeLeaveAction } from "./actions";
import { LeaveForm, RemoveLeaveButton } from "./leave-forms";

export const metadata: Metadata = { title: "Leave" };

type Search = { staff?: string | string[] };

async function Leave({ searchParams }: { searchParams: Promise<Search> }) {
  const viewer = await requireStaff();
  const managesAll = MANAGE_ANY_LEAVE.includes(viewer.role);
  const today = todayInMyt();

  const staffList = managesAll
    ? await db.staff.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true },
      })
    : [];
  const raw = (await searchParams).staff;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  // Only Admin and Master Admin can look at someone else's leave here.
  const target = managesAll ? (staffList.find((person) => person.id === requested) ?? viewer) : viewer;

  const entries = await db.leaveEntry.findMany({
    where: { staffId: target.id, date: { gte: new Date(`${today.slice(0, 7)}-01T00:00:00Z`) } },
    orderBy: { date: "asc" },
    select: { id: true, date: true, hours: true, note: true },
  });

  return (
    <div className="flex flex-col gap-8">
      {managesAll && (
        <form className="flex items-end gap-2 text-sm">
          <label className="flex flex-col gap-1 text-zinc-700">
            Staff member
            <select
              name="staff"
              defaultValue={target.id}
              className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              {staffList.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} · {ROLE_LABELS[person.role]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded bg-zinc-900 px-4 py-2 font-medium text-white">
            Go
          </button>
        </form>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">
          Record leave{target.id === viewer.id ? "" : ` for ${target.name}`}
        </h2>
        <p className="text-sm text-zinc-600">
          Whole days skip weekends and public holidays. Leave is taken off available hours for utilisation.
        </p>
        <LeaveForm key={target.id} action={addLeaveAction} staffId={target.id} today={today} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Leave from this month</h2>
        <table className="w-full max-w-3xl border-collapse bg-white text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Leave</th>
              <th className="p-3 font-medium">Note</th>
              <th className="p-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-zinc-100 align-top text-zinc-900">
                <td className="p-3">{formatDate(entry.date)}</td>
                <td className="p-3">{leaveLabel(Number(entry.hours))}</td>
                <td className="whitespace-pre-wrap p-3">{entry.note ?? "—"}</td>
                <td className="p-3">
                  <RemoveLeaveButton action={removeLeaveAction.bind(null, entry.id)} />
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3 text-zinc-600">
                  No leave recorded from this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function LeavePage({ searchParams }: PageProps<"/leave">) {
  return (
    <PageShell title="Leave" back="/">
      <Suspense fallback={null}>
        <Leave searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
