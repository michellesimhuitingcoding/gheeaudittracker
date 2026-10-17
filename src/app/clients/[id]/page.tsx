import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import {
  AUDIT_BY_LABELS,
  CLIENT_STATUS_LABELS,
  ENTITY_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  SERVICE_LABELS,
  formatFye,
} from "@/lib/clients/options";
import { canChangeOwner, canChangePaymentStatus, canEditClient, canViewClient } from "@/lib/clients/permissions";
import { clientPeopleOptions } from "@/lib/clients/queries";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import {
  addExternalAuditorAction,
  removeExternalAuditorAction,
  updateClientAction,
  updateExternalAuditorAction,
} from "../actions";
import { ClientForm } from "../client-form";
import { AddExternalAuditor, ExternalAuditorRow } from "../external-auditors";

export const metadata: Metadata = { title: "Client" };

const dateOnly = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-zinc-900">{value || "—"}</dd>
    </div>
  );
}

async function ClientDetails({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  const { id } = await params;
  const client = await db.client.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      manager: { select: { name: true } },
      partner: { select: { name: true } },
      senior: { select: { name: true } },
      signingPartners: { include: { partner: { select: { name: true } } } },
      assignedStaff: { include: { staff: { select: { name: true } } } },
      externalAuditors: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!client) notFound();
  const assignedStaffIds = client.assignedStaff.map((row) => row.staffId);
  if (!canViewClient(viewer, { ...client, assignedStaffIds })) return <NoPermission />;

  const lastChange = await db.auditLog.findFirst({
    where: { entityType: "Client", entityId: client.id },
    orderBy: [{ at: "desc" }, { id: "desc" }],
    select: { at: true, actor: { select: { name: true } } },
  });
  const signingPartnerIds = client.signingPartners.map((row) => row.partnerId);
  const editable = canEditClient(viewer, client);

  return (
    <div className="flex flex-col gap-10">
      {lastChange && (
        <p className="text-sm text-zinc-600">
          Last updated by {lastChange.actor?.name ?? "—"} at {formatDateTime(lastChange.at)}
        </p>
      )}

      {editable ? (
        <ClientForm
          action={updateClientAction.bind(null, client.id)}
          values={{
            ...client,
            incorporationDate: dateOnly(client.incorporationDate),
            signingPartnerIds,
            assignedStaffIds,
          }}
          people={await clientPeopleOptions({ ...client, signingPartnerIds, assignedStaffIds })}
          ownerLocked={!canChangeOwner(viewer)}
          canEditPayment={canChangePaymentStatus(viewer)}
          submitLabel="Save changes"
        />
      ) : (
        <dl className="grid max-w-3xl grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Detail label="Entity type" value={ENTITY_TYPE_LABELS[client.entityType]} />
          <Detail label="Registration no." value={client.regNo} />
          <Detail label="TIN" value={client.tin} />
          <Detail label="FYE" value={formatFye(client.fyeDay, client.fyeMonth)} />
          <Detail label="Incorporation date" value={dateOnly(client.incorporationDate)} />
          <Detail label="Sourced by" value={client.owner.name} />
          <Detail label="Manager" value={client.manager?.name} />
          <Detail label="Partner" value={client.partner?.name} />
          <Detail label="Senior" value={client.senior?.name} />
          <Detail label="Assigned staff" value={client.assignedStaff.map((row) => row.staff.name).join(", ")} />
          <Detail label="Services" value={client.services.map((service) => SERVICE_LABELS[service]).join(", ")} />
          <Detail label="Status" value={CLIENT_STATUS_LABELS[client.status]} />
          <Detail label="Payment status" value={PAYMENT_STATUS_LABELS[client.paymentStatus]} />
          <Detail label="Dormant" value={client.dormant ? "Yes" : "No"} />
          <Detail label="Prepare Form EA" value={client.prepareFormEA ? "Yes" : "No"} />
          <Detail label="Audit by" value={client.auditBy ? AUDIT_BY_LABELS[client.auditBy] : null} />
          <Detail
            label="Signing partners"
            value={client.signingPartners.map((row) => row.partner.name).join(", ")}
          />
          <Detail label="Contact name" value={client.contactName} />
          <Detail label="Contact phone" value={client.contactPhone} />
          <Detail label="Contact email" value={client.contactEmail} />
          <Detail label="Address" value={client.address} />
        </dl>
      )}

      <section className="flex max-w-2xl flex-col gap-3">
        <h2 className="font-medium text-zinc-900">External auditors</h2>
        {client.externalAuditors.length === 0 && <p className="text-sm text-zinc-600">None recorded.</p>}
        {client.externalAuditors.map((auditor) =>
          editable ? (
            <ExternalAuditorRow
              key={auditor.id}
              values={{ ...auditor, auditDeadline: dateOnly(auditor.auditDeadline) }}
              updateAction={updateExternalAuditorAction.bind(null, auditor.id)}
              removeAction={removeExternalAuditorAction.bind(null, auditor.id)}
            />
          ) : (
            <dl key={auditor.id} className="grid grid-cols-2 gap-3 rounded border border-zinc-200 bg-white p-4 text-sm">
              <Detail label="Firm" value={auditor.firmName} />
              <Detail label="Contact" value={auditor.contact} />
              <Detail label="Audit deadline" value={dateOnly(auditor.auditDeadline)} />
              <Detail label="Status" value={auditor.status} />
            </dl>
          ),
        )}
        {editable && <AddExternalAuditor action={addExternalAuditorAction.bind(null, client.id)} />}
      </section>
    </div>
  );
}

export default function ClientPage({ params }: PageProps<"/clients/[id]">) {
  return (
    <PageShell title="Client" back="/clients">
      <Suspense fallback={null}>
        <ClientDetails params={params} />
      </Suspense>
    </PageShell>
  );
}
