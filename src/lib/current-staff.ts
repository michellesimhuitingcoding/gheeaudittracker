import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/permissions";

// Server-side check for every protected page and action (RULES.md 13).
// Reloads the staff record so deactivation and role changes apply at once.
export async function requireStaff(allowed?: readonly Role[]) {
  const session = await getServerSession(authOptions);
  const staffId = session?.staffId;
  if (!staffId) redirect("/login");

  const staff = await db.staff.findUnique({
    where: { id: staffId },
    select: { id: true, staffId: true, name: true, email: true, role: true, active: true },
  });
  if (!staff || !staff.active) redirect("/login");

  if (allowed) assertRole(staff.role, allowed);
  return staff;
}
