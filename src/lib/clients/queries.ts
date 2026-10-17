import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export type PersonOption = { id: string; name: string };

async function peopleWithRoles(roles: Role[], include: (string | null | undefined)[]) {
  const keep = include.filter((id): id is string => Boolean(id));
  return db.staff.findMany({
    where: { OR: [{ role: { in: roles }, active: true }, { id: { in: keep } }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// Choices for the client form; current values stay listed even if that person
// has since left or changed role.
export async function clientPeopleOptions(current?: {
  ownerId: string;
  managerId: string | null;
  partnerId: string | null;
  signingPartnerIds: string[];
}) {
  const [owners, managers, partners, signingPartners] = await Promise.all([
    peopleWithRoles(["MANAGER", "PARTNER"], [current?.ownerId]),
    peopleWithRoles(["MANAGER"], [current?.managerId]),
    peopleWithRoles(["PARTNER"], [current?.partnerId]),
    peopleWithRoles(["PARTNER"], current?.signingPartnerIds ?? []),
  ]);
  return { owners, managers, partners, signingPartners };
}

export type ClientPeopleOptions = Awaited<ReturnType<typeof clientPeopleOptions>>;
