import type { Prisma } from "@/generated/prisma/client";
import { ClientStatus, EntityType, PaymentStatus, Service } from "@/generated/prisma/enums";

export type ClientListSearch = {
  q?: string;
  entityType?: EntityType;
  service?: Service;
  status?: ClientStatus;
  payment?: PaymentStatus;
  mine: boolean;
};

type RawSearch = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(options: Record<string, T>, value: string | undefined): T | undefined {
  return value && Object.values(options).includes(value as T) ? (value as T) : undefined;
}

// Reads the list's URL parameters, ignoring anything unexpected.
export function parseClientListSearch(raw: RawSearch): ClientListSearch {
  const q = first(raw.q)?.trim().slice(0, 100);
  return {
    q: q || undefined,
    entityType: oneOf(EntityType, first(raw.entityType)),
    service: oneOf(Service, first(raw.service)),
    status: oneOf(ClientStatus, first(raw.status)),
    payment: oneOf(PaymentStatus, first(raw.payment)),
    mine: first(raw.show) === "mine",
  };
}

// Search and filter conditions, combined with the viewer's visibility filter.
export function clientListWhere(visible: Prisma.ClientWhereInput, search: ClientListSearch): Prisma.ClientWhereInput {
  const and: Prisma.ClientWhereInput[] = [visible];
  if (search.q) {
    const code = search.q.toUpperCase().replace(/\s+/g, "");
    and.push({
      OR: [
        { name: { contains: search.q, mode: "insensitive" } },
        { regNo: { contains: code } },
        { tin: { contains: code } },
      ],
    });
  }
  if (search.entityType) and.push({ entityType: search.entityType });
  if (search.service) and.push({ services: { has: search.service } });
  if (search.status) and.push({ status: search.status });
  if (search.payment) and.push({ paymentStatus: search.payment });
  return { AND: and };
}

export const UNASSIGNED = "Unassigned";

// Groups clients under their Manager's name, A–Z, with "Unassigned" last.
export function groupByManager<T extends { manager: { name: string } | null }>(clients: T[]) {
  const groups = new Map<string, T[]>();
  for (const client of clients) {
    const key = client.manager?.name ?? UNASSIGNED;
    groups.set(key, [...(groups.get(key) ?? []), client]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === UNASSIGNED ? 1 : b === UNASSIGNED ? -1 : a.localeCompare(b)))
    .map(([manager, items]) => ({ manager, clients: items }));
}
