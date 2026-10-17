import type { Role } from "@/generated/prisma/enums";
import { verifyPassword } from "@/lib/password";

export type StaffRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  passwordHash: string;
};

export type AuthenticatedStaff = Pick<StaffRecord, "id" | "name" | "email" | "role">;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Returns the staff member for valid credentials, or null. Callers must not
// reveal which part failed.
export async function authenticate(
  credentials: { email?: unknown; password?: unknown } | undefined,
  findStaffByEmail: (email: string) => Promise<StaffRecord | null>,
): Promise<AuthenticatedStaff | null> {
  const email = credentials?.email;
  const password = credentials?.password;
  if (typeof email !== "string" || typeof password !== "string") return null;
  if (email.trim() === "" || password === "") return null;

  const staff = await findStaffByEmail(normaliseEmail(email));
  if (!staff || !staff.active) return null;
  if (!(await verifyPassword(password, staff.passwordHash))) return null;

  return { id: staff.id, name: staff.name, email: staff.email, role: staff.role };
}
