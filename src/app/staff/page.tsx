import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/roles";

export const metadata: Metadata = { title: "Staff" };

async function StaffList() {
  const actor = await requireStaff();
  if (actor.role !== "MASTER_ADMIN") return <NoPermission />;

  const staff = await db.staff.findMany({
    orderBy: { name: "asc" },
    select: { id: true, staffId: true, name: true, email: true, role: true, active: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/staff/new"
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Add staff
      </Link>
      <table className="w-full max-w-5xl border-collapse bg-white text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            <th className="p-3 font-medium">Staff ID</th>
            <th className="p-3 font-medium">Name</th>
            <th className="p-3 font-medium">Email</th>
            <th className="p-3 font-medium">Role</th>
            <th className="p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id} className="border-b border-zinc-100 text-zinc-900">
              <td className="p-3">{member.staffId}</td>
              <td className="p-3">
                <Link href={`/staff/${member.id}`} className="underline">
                  {member.name}
                </Link>
              </td>
              <td className="p-3">{member.email}</td>
              <td className="p-3">{ROLE_LABELS[member.role]}</td>
              <td className="p-3">{member.active ? "Active" : "Inactive"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StaffPage() {
  return (
    <PageShell title="Staff" back="/">
      <Suspense fallback={null}>
        <StaffList />
      </Suspense>
    </PageShell>
  );
}
