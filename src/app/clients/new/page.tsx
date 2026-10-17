import type { Metadata } from "next";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { canChangePaymentStatus, canCreateClient } from "@/lib/clients/permissions";
import { clientPeopleOptions } from "@/lib/clients/queries";
import { requireStaff } from "@/lib/current-staff";
import { createClientAction } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Add client" };

async function NewClient() {
  const viewer = await requireStaff();
  if (!canCreateClient(viewer)) return <NoPermission />;

  return (
    <ClientForm
      action={createClientAction}
      people={await clientPeopleOptions()}
      ownerLocked={false}
      canEditPayment={canChangePaymentStatus(viewer)}
      submitLabel="Add client"
    />
  );
}

export default function NewClientPage() {
  return (
    <PageShell title="Add client" back="/clients">
      <Suspense fallback={null}>
        <NewClient />
      </Suspense>
    </PageShell>
  );
}
