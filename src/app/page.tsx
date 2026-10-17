import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { clientListFilter } from "@/lib/clients/permissions";
import { requireStaff } from "@/lib/current-staff";
import { hasRole } from "@/lib/permissions";
import { ROLE_LABELS, VIEW_AUDIT_LOG } from "@/lib/roles";
import { VIEW_HOURLY_RATES } from "@/lib/timecost/permissions";
import { canUseTimesheet } from "@/lib/timesheet/permissions";

async function CurrentStaff() {
  const staff = await requireStaff();

  return (
    <div className="flex items-center gap-4 text-sm text-zinc-700">
      {clientListFilter(staff) && (
        <>
          <Link href="/clients" className="underline">
            Clients
          </Link>
          <Link href="/calendar" className="underline">
            Calendar
          </Link>
        </>
      )}
      {staff.role === "MANAGER" && (
        <Link href="/progress" className="underline">
          My Progress
        </Link>
      )}
      {staff.role === "MANAGER" && (
        <Link href="/team" className="underline">
          Team Overview
        </Link>
      )}
      {canUseTimesheet(staff.role) && (
        <Link href="/timesheet" className="underline">
          Timesheet
        </Link>
      )}
      {staff.role === "MASTER_ADMIN" && (
        <Link href="/staff" className="underline">
          Staff
        </Link>
      )}
      {hasRole(staff.role, VIEW_HOURLY_RATES) && (
        <Link href="/rates" className="underline">
          Rates &amp; holidays
        </Link>
      )}
      {hasRole(staff.role, VIEW_AUDIT_LOG) && (
        <Link href="/audit" className="underline">
          Audit log
        </Link>
      )}
      <span>
        {staff.name} · {ROLE_LABELS[staff.role]}
      </span>
      <NotificationBell />
      <LogoutButton />
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Ghee Audit Tracker</h1>
        <Suspense fallback={null}>
          <CurrentStaff />
        </Suspense>
      </header>
    </main>
  );
}
