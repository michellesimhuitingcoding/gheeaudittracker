import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { isoDate } from "@/lib/deadlines";
import { formatDateTime } from "@/lib/format";
import { hasRole } from "@/lib/permissions";
import { RECORD_LAST_DAY } from "@/lib/resignation/schema";
import { resetPasswordAction, setLastDayAction, setStaffActiveAction, updateStaffAction } from "../actions";
import { ActiveToggle, LastDayForm, ResetPasswordForm } from "../staff-account";
import { StaffForm } from "../staff-form";

export const metadata: Metadata = { title: "Edit staff" };

async function EditStaff({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaff();
  if (!hasRole(actor.role, RECORD_LAST_DAY)) return <NoPermission />;
  const isMasterAdmin = actor.role === "MASTER_ADMIN";

  const { id } = await params;
  const staff = await db.staff.findUnique({
    where: { id },
    select: { id: true, staffId: true, name: true, email: true, role: true, active: true, lastDay: true },
  });
  if (!staff) notFound();

  const lastChange = await db.auditLog.findFirst({
    where: { entityType: "Staff", entityId: staff.id, action: { startsWith: "STAFF_" } },
    orderBy: [{ at: "desc" }, { id: "desc" }],
    select: { at: true, actor: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-10">
      {lastChange && (
        <p className="text-sm text-zinc-600">
          Last updated by {lastChange.actor?.name ?? "—"} at {formatDateTime(lastChange.at)}
        </p>
      )}
      {isMasterAdmin ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium text-zinc-900">Details</h2>
          <StaffForm action={updateStaffAction.bind(null, staff.id)} values={staff} submitLabel="Save changes" />
        </section>
      ) : (
        <p className="text-sm text-zinc-700">
          {staff.name} ({staff.staffId})
        </p>
      )}
      {staff.active && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium text-zinc-900">Last day</h2>
          <LastDayForm
            action={setLastDayAction.bind(null, staff.id)}
            lastDay={staff.lastDay ? isoDate(staff.lastDay) : ""}
          />
        </section>
      )}
      {isMasterAdmin && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-medium text-zinc-900">Access</h2>
            <ActiveToggle action={setStaffActiveAction.bind(null, staff.id)} active={staff.active} />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="font-medium text-zinc-900">Password</h2>
            <ResetPasswordForm action={resetPasswordAction.bind(null, staff.id)} />
          </section>
        </>
      )}
    </div>
  );
}

export default function EditStaffPage({ params }: PageProps<"/staff/[id]">) {
  return (
    <PageShell title="Edit staff" back="/staff">
      <Suspense fallback={null}>
        <EditStaff params={params} />
      </Suspense>
    </PageShell>
  );
}
