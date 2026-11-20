import { createHash, randomBytes } from "node:crypto";

// A reset link works for one hour, once.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
// At most one new link per account in this window, so the form cannot be
// used to flood a mailbox.
export const RESET_REQUEST_COOLDOWN_MS = 2 * 60 * 1000;

export const RESET_PATH = "/login/reset-password";

// Only the hash is stored, so a copy of the database cannot be used to reset
// passwords.
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function resetLink(baseUrl: string, token: string): string {
  const url = new URL(RESET_PATH, baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function isResetTokenUsable(record: { expiresAt: Date; usedAt: Date | null }, now: Date): boolean {
  return record.usedAt === null && record.expiresAt.getTime() > now.getTime();
}
