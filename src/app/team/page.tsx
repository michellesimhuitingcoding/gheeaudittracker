import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActivityBadge } from "@/components/activity-badge";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { UtilisationCell } from "@/components/utilisation";
import { requireStaff } from "@/lib/current-staff";
import { formatDate } from "@/lib/deadlines";
import { formatDateTime } from "@/lib/format";
import { leaveLabel } from "@/lib/leave/leave";
import { ROLE_LABELS } from "@/lib/roles";
import { teamOverview } from "@/lib/team/service";

export const metadata: Metadata = { title: "Team Overview" };

async function Team() {
  const viewer = await requireStaff();
  if (viewer.role !== "MANAGER") return <NoPermission />;

  const now = new Date();
  const team = await teamOverview(viewer, now);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600">
        Seniors and Juniors currently assigned to your clients. Utilisation is billable hours (Work and Overtime on
        any job) ÷ available hours (8 per weekday, less public holidays and leave).
      </p>
      <table className="w-full max-w-6xl border-collapse bg-white text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            <th className="p-3 font-medium">Name</th>
            <th className="p-3 font-medium">Role</th>
            <th className="p-3 font-medium">Your clients</th>
            <th className="p-3 font-medium">Audit jobs</th>
            <th className="p-3 font-medium">Hours this week</th>
            <th className="p-3 font-medium">Utilisation (month to date)</th>
            <th className="p-3 font-medium">Last check-in (MYT)</th>
            <th className="p-3 font-medium">Leave this week</th>
          </tr>
        </thead>
        <tbody>
          {team.map((member) => (
            <tr key={member.id} className="border-b border-zinc-100 align-top text-zinc-900">
              <td className="p-3">{member.name}</td>
              <td className="p-3">{ROLE_LABELS[member.role]}</td>
              <td className="p-3">
                <ul className="flex flex-col gap-1">
                  {member.clients.map((client) => (
                    <li key={client.id}>
                      <Link href={`/clients/${client.id}`} className="underline">
                        {client.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="p-3">{member.jobs}</td>
              <td className="p-3">{member.hoursThisWeek}</td>
              <td className="p-3">
                <UtilisationCell utilisation={member.utilisation} />
              </td>
              <td className="p-3">
                {member.lastCheckIn ? (
                  <div className="flex flex-col gap-1">
                    {formatDateTime(member.lastCheckIn)}
                    <ActivityBadge lastActivity={member.lastCheckIn} now={now} />
                  </div>
                ) : (
                  <span className="text-zinc-600">No check-ins</span>
                )}
              </td>
              <td className="p-3">
                {member.leaveThisWeek.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {member.leaveThisWeek.map((leave) => (
                      <li key={leave.date.toISOString()}>
                        {formatDate(leave.date)} · {leaveLabel(leave.hours)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
            </tr>
          ))}
          {team.length === 0 && (
            <tr>
              <td colSpan={8} className="p-3 text-zinc-600">
                No Seniors or Juniors are assigned to your clients.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function TeamPage() {
  return (
    <PageShell title="Team Overview" back="/">
      <Suspense fallback={null}>
        <Team />
      </Suspense>
    </PageShell>
  );
}
