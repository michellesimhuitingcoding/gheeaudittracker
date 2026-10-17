import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import {
  CLIENT_STATUS_LABELS,
  ENTITY_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  SERVICE_LABELS,
  formatFye,
} from "@/lib/clients/options";
import { canCreateClient, clientListFilter } from "@/lib/clients/permissions";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Clients" };

async function ClientList() {
  const viewer = await requireStaff();
  const filter = clientListFilter(viewer);
  if (!filter) return <NoPermission />;

  const clients = await db.client.findMany({
    where: filter,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      entityType: true,
      regNo: true,
      fyeDay: true,
      fyeMonth: true,
      services: true,
      paymentStatus: true,
      status: true,
      manager: { select: { name: true } },
      partner: { select: { name: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {canCreateClient(viewer) && (
        <Link href="/clients/new" className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Add client
        </Link>
      )}
      <table className="w-full max-w-6xl border-collapse bg-white text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            <th className="p-3 font-medium">Client</th>
            <th className="p-3 font-medium">Entity</th>
            <th className="p-3 font-medium">Reg. no.</th>
            <th className="p-3 font-medium">FYE</th>
            <th className="p-3 font-medium">Manager</th>
            <th className="p-3 font-medium">Partner</th>
            <th className="p-3 font-medium">Services</th>
            <th className="p-3 font-medium">Payment</th>
            <th className="p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-zinc-100 text-zinc-900">
              <td className="p-3">
                <Link href={`/clients/${client.id}`} className="underline">
                  {client.name}
                </Link>
              </td>
              <td className="p-3">{ENTITY_TYPE_LABELS[client.entityType]}</td>
              <td className="p-3">{client.regNo ?? "—"}</td>
              <td className="p-3">{formatFye(client.fyeDay, client.fyeMonth)}</td>
              <td className="p-3">{client.manager?.name ?? "—"}</td>
              <td className="p-3">{client.partner?.name ?? "—"}</td>
              <td className="p-3">{client.services.map((service) => SERVICE_LABELS[service]).join(", ")}</td>
              <td className="p-3">{PAYMENT_STATUS_LABELS[client.paymentStatus]}</td>
              <td className="p-3">{CLIENT_STATUS_LABELS[client.status]}</td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan={9} className="p-3 text-zinc-600">
                No clients yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <PageShell title="Clients" back="/">
      <Suspense fallback={null}>
        <ClientList />
      </Suspense>
    </PageShell>
  );
}
