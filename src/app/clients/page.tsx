import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { clientListWhere, groupByManager, parseClientListSearch, type ClientListSearch } from "@/lib/clients/list";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  SERVICES,
  SERVICE_LABELS,
  formatFye,
} from "@/lib/clients/options";
import { canCreateClient, clientListFilter } from "@/lib/clients/permissions";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Clients" };

type RawSearch = Record<string, string | string[] | undefined>;

const selectClass = "rounded border border-zinc-300 px-3 py-2 text-zinc-900";

function showHref(search: ClientListSearch, mine: boolean) {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  if (search.entityType) params.set("entityType", search.entityType);
  if (search.service) params.set("service", search.service);
  if (search.status) params.set("status", search.status);
  if (search.payment) params.set("payment", search.payment);
  if (mine) params.set("show", "mine");
  const query = params.toString();
  return query ? `/clients?${query}` : "/clients";
}

function Filter<T extends string>({
  name,
  label,
  value,
  options,
  labels,
}: {
  name: string;
  label: string;
  value: T | undefined;
  options: T[];
  labels: Record<T, string>;
}) {
  return (
    <label className="flex flex-col gap-1 text-zinc-700">
      {label}
      <select name={name} defaultValue={value ?? ""} className={selectClass}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

async function ClientList({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const viewer = await requireStaff();
  const search = parseClientListSearch(await searchParams);
  const visible = clientListFilter(viewer, { mine: search.mine });
  if (!visible) return <NoPermission />;

  const clients = await db.client.findMany({
    where: clientListWhere(visible, search),
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
  const groups = groupByManager(clients);
  const isPartner = viewer.role === "PARTNER";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {canCreateClient(viewer) && (
          <Link href="/clients/new" className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
            Add client
          </Link>
        )}
        {isPartner && (
          <nav aria-label="Show" className="flex items-center gap-1 text-sm">
            <span className="mr-1 text-zinc-600">Show:</span>
            {[
              { mine: false, label: "All Clients" },
              { mine: true, label: "My Clients only" },
            ].map((option) => (
              <Link
                key={option.label}
                href={showHref(search, option.mine)}
                aria-current={search.mine === option.mine ? "page" : undefined}
                className={
                  search.mine === option.mine
                    ? "rounded bg-zinc-900 px-3 py-1.5 text-white"
                    : "rounded border border-zinc-300 px-3 py-1.5 text-zinc-700"
                }
              >
                {option.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-3 text-sm">
        {search.mine && <input type="hidden" name="show" value="mine" />}
        <label className="flex flex-col gap-1 text-zinc-700">
          Search
          <input
            name="q"
            defaultValue={search.q ?? ""}
            placeholder="Name, reg. no. or TIN"
            className={selectClass}
          />
        </label>
        <Filter name="entityType" label="Entity" value={search.entityType} options={ENTITY_TYPES} labels={ENTITY_TYPE_LABELS} />
        <Filter name="service" label="Service" value={search.service} options={SERVICES} labels={SERVICE_LABELS} />
        <Filter name="status" label="Status" value={search.status} options={CLIENT_STATUSES} labels={CLIENT_STATUS_LABELS} />
        <Filter name="payment" label="Payment" value={search.payment} options={PAYMENT_STATUSES} labels={PAYMENT_STATUS_LABELS} />
        <button type="submit" className="rounded bg-zinc-900 px-4 py-2 font-medium text-white">
          Apply
        </button>
        <Link href={showHref({ mine: search.mine }, search.mine)} className="py-2 text-zinc-600 underline">
          Clear
        </Link>
      </form>

      <p className="text-sm text-zinc-600">
        {clients.length} {clients.length === 1 ? "client" : "clients"}
      </p>

      {groups.length === 0 && <p className="text-sm text-zinc-600">No clients match.</p>}
      {groups.map((group) => (
        <section key={group.manager} className="flex flex-col gap-2">
          <h2 className="font-medium text-zinc-900">
            {group.manager} <span className="font-normal text-zinc-500">({group.clients.length})</span>
          </h2>
          <table className="w-full max-w-6xl border-collapse bg-white text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-600">
                <th className="p-3 font-medium">Client</th>
                <th className="p-3 font-medium">Entity</th>
                <th className="p-3 font-medium">Reg. no.</th>
                <th className="p-3 font-medium">FYE</th>
                <th className="p-3 font-medium">Partner</th>
                <th className="p-3 font-medium">Services</th>
                <th className="p-3 font-medium">Payment</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {group.clients.map((client) => (
                <tr key={client.id} className="border-b border-zinc-100 text-zinc-900">
                  <td className="p-3">
                    <Link href={`/clients/${client.id}`} className="underline">
                      {client.name}
                    </Link>
                  </td>
                  <td className="p-3">{ENTITY_TYPE_LABELS[client.entityType]}</td>
                  <td className="p-3">{client.regNo ?? "—"}</td>
                  <td className="p-3">{formatFye(client.fyeDay, client.fyeMonth)}</td>
                  <td className="p-3">{client.partner?.name ?? "—"}</td>
                  <td className="p-3">{client.services.map((service) => SERVICE_LABELS[service]).join(", ")}</td>
                  <td className="p-3">{PAYMENT_STATUS_LABELS[client.paymentStatus]}</td>
                  <td className="p-3">{CLIENT_STATUS_LABELS[client.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

export default function ClientsPage({ searchParams }: PageProps<"/clients">) {
  return (
    <PageShell title="Clients" back="/">
      <Suspense fallback={null}>
        <ClientList searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
