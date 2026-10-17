import type { Role } from "@/generated/prisma/enums";

export class ForbiddenError extends Error {
  constructor() {
    super("You do not have permission to do this.");
    this.name = "ForbiddenError";
  }
}

export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}

export function assertRole(role: Role, allowed: readonly Role[]): void {
  if (!hasRole(role, allowed)) throw new ForbiddenError();
}
