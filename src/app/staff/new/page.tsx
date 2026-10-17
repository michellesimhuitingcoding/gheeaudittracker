import type { Metadata } from "next";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { requireStaff } from "@/lib/current-staff";
import { createStaffAction } from "../actions";
import { StaffForm } from "../staff-form";

export const metadata: Metadata = { title: "Add staff" };

async function NewStaff() {
  const actor = await requireStaff();
  if (actor.role !== "MASTER_ADMIN") return <NoPermission />;
  return <StaffForm action={createStaffAction} submitLabel="Add staff" withPassword />;
}

export default function NewStaffPage() {
  return (
    <PageShell title="Add staff" back="/staff">
      <Suspense fallback={null}>
        <NewStaff />
      </Suspense>
    </PageShell>
  );
}
