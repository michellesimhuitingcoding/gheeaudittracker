import type { Metadata } from "next";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import type { Role } from "@/generated/prisma/enums";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/deadlines";
import { hasRole } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/roles";
import { EDIT_HOURLY_RATES, MANAGE_PUBLIC_HOLIDAYS, VIEW_HOURLY_RATES } from "@/lib/timecost/permissions";
import { formatRinggit } from "@/lib/timecost/timecost";
import { STANDARD_HOURS_PER_DAY } from "@/lib/timecost/utilisation";
import { addPublicHolidayAction, removePublicHolidayAction, setHourlyRateAction } from "./actions";
import { HourlyRateForm, PublicHolidayForm, RemoveHolidayButton } from "./rate-forms";

export const metadata: Metadata = { title: "Rates & holidays" };

// Roles that log time, so their hours carry a timecost.
const RATED_ROLES: readonly Role[] = ["JUNIOR", "SENIOR", "MANAGER", "PARTNER"];

async function Rates() {
  const viewer = await requireStaff();
  if (!hasRole(viewer.role, VIEW_HOURLY_RATES)) return <NoPermission />;
  const canEditRates = hasRole(viewer.role, EDIT_HOURLY_RATES);
  const canEditHolidays = hasRole(viewer.role, MANAGE_PUBLIC_HOLIDAYS);

  const [staff, holidays] = await Promise.all([
    db.staff.findMany({
      where: { active: true, role: { in: [...RATED_ROLES] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, hourlyRate: true },
    }),
    db.publicHoliday.findMany({ orderBy: { date: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Hourly rates</h2>
        <p className="text-sm text-zinc-600">
          Manual estimates used for timecost (hours × hourly rate).
          {!canEditRates && " View only."}
        </p>
        <table className="w-full max-w-3xl border-collapse bg-white text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Hourly rate</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-b border-zinc-100 align-top text-zinc-900">
                <td className="p-3">{member.name}</td>
                <td className="p-3">{ROLE_LABELS[member.role]}</td>
                <td className="p-3">
                  {canEditRates ? (
                    <HourlyRateForm
                      action={setHourlyRateAction.bind(null, member.id)}
                      current={member.hourlyRate?.toFixed(2) ?? ""}
                    />
                  ) : member.hourlyRate ? (
                    formatRinggit(Number(member.hourlyRate))
                  ) : (
                    <span className="text-zinc-500">Not set</span>
                  )}
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={3} className="p-3 text-zinc-600">
                  No active staff log time.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Public holidays</h2>
        <p className="text-sm text-zinc-600">
          Available hours for utilisation are {STANDARD_HOURS_PER_DAY} per weekday, less these holidays.
        </p>
        {canEditHolidays && <PublicHolidayForm action={addPublicHolidayAction} />}
        <table className="w-full max-w-3xl border-collapse bg-white text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Name</th>
              {canEditHolidays && <th className="p-3 font-medium" />}
            </tr>
          </thead>
          <tbody>
            {holidays.map((holiday) => (
              <tr key={holiday.id} className="border-b border-zinc-100 align-top text-zinc-900">
                <td className="p-3">{formatDate(holiday.date)}</td>
                <td className="p-3">{holiday.name}</td>
                {canEditHolidays && (
                  <td className="p-3">
                    <RemoveHolidayButton action={removePublicHolidayAction.bind(null, holiday.id)} />
                  </td>
                )}
              </tr>
            ))}
            {holidays.length === 0 && (
              <tr>
                <td colSpan={canEditHolidays ? 3 : 2} className="p-3 text-zinc-600">
                  No public holidays set.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function RatesPage() {
  return (
    <PageShell title="Rates & holidays" back="/">
      <Suspense fallback={null}>
        <Rates />
      </Suspense>
    </PageShell>
  );
}
