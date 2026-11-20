import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { PasswordResetEmail } from "./email";
import { RESET_DONE_MESSAGE, RESET_LINK_INVALID, RESET_REQUESTED_MESSAGE } from "./schema";
import { isResetLinkValid, requestPasswordReset, resetPasswordWithToken } from "./service";
import { RESET_REQUEST_COOLDOWN_MS, RESET_TOKEN_TTL_MS } from "./token";

const OLD_PASSWORD = "old password 123";
const NEW_PASSWORD = "new password 456";
const baseUrl = "http://localhost:3000";
const now = new Date("2032-05-01T02:00:00Z");
const generic = { ok: true, message: RESET_REQUESTED_MESSAGE };

async function staff(active = true) {
  const id = randomUUID().slice(0, 8);
  return db.staff.create({
    data: {
      staffId: `PR-${id}`,
      name: "Reset Test",
      email: `pr-${id}@example.com`,
      role: "JUNIOR",
      active,
      passwordHash: await hashPassword(OLD_PASSWORD),
    },
  });
}

// Requests a link and returns the token from the "sent" email.
async function requestToken(email: string, at = now) {
  const sent: PasswordResetEmail[] = [];
  const result = await requestPasswordReset(email, { baseUrl, now: at, send: async (mail) => void sent.push(mail) });
  const token = sent[0] ? new URL(sent[0].link).searchParams.get("token") : null;
  return { result, sent, token };
}

const passwords = { password: NEW_PASSWORD, confirm: NEW_PASSWORD };

describe("password reset (database)", () => {
  it("sends a one-hour link to an active account", async () => {
    const member = await staff();
    const { result, sent, token } = await requestToken(member.email.toUpperCase());
    expect(result).toEqual(generic);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: member.email, expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS) });
    expect(sent[0].link.startsWith(`${baseUrl}/login/reset-password?token=`)).toBe(true);

    const stored = await db.passwordResetToken.findFirstOrThrow({ where: { staffId: member.id } });
    expect(stored.tokenHash).not.toBe(token);
    expect(await db.auditLog.count({ where: { action: "PASSWORD_RESET_REQUESTED", entityId: member.id } })).toBe(1);
  });

  it("gives the same message and sends nothing for unknown or inactive accounts", async () => {
    const inactive = await staff(false);
    expect(await requestToken("nobody-here@example.com")).toMatchObject({ result: generic, sent: [] });
    expect(await requestToken(inactive.email)).toMatchObject({ result: generic, sent: [] });
    expect(await db.passwordResetToken.count({ where: { staffId: inactive.id } })).toBe(0);
  });

  it("asks for a valid email", async () => {
    expect(await requestPasswordReset("not-an-email", { baseUrl, now })).toEqual({
      ok: false,
      fieldErrors: { email: ["Enter a valid email address."] },
    });
  });

  it("still shows the generic message when the email fails to send", async () => {
    const member = await staff();
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await requestPasswordReset(member.email, {
      baseUrl,
      now,
      send: async () => {
        throw new Error("provider down");
      },
    });
    expect(result).toEqual(generic);
    expect(quiet).toHaveBeenCalled();
    quiet.mockRestore();
  });

  it("sends at most one link per cooldown, and only the newest link works", async () => {
    const member = await staff();
    const first = await requestToken(member.email);
    expect((await requestToken(member.email, new Date(now.getTime() + 1000))).sent).toEqual([]);

    const later = new Date(now.getTime() + RESET_REQUEST_COOLDOWN_MS + 1000);
    const second = await requestToken(member.email, later);
    expect(second.sent).toHaveLength(1);
    expect(await isResetLinkValid(first.token, later)).toBe(false);
    expect(await isResetLinkValid(second.token, later)).toBe(true);
  });

  it("resets the password once and logs it without the password", async () => {
    const member = await staff();
    const { token } = await requestToken(member.email);
    expect(await resetPasswordWithToken(token, passwords, now)).toEqual({ ok: true, message: RESET_DONE_MESSAGE });

    const updated = await db.staff.findUniqueOrThrow({ where: { id: member.id } });
    expect(await verifyPassword(NEW_PASSWORD, updated.passwordHash)).toBe(true);
    const logged = await db.auditLog.findFirstOrThrow({ where: { action: "STAFF_PASSWORD_RESET_BY_LINK", entityId: member.id } });
    expect(logged).toMatchObject({ actorId: member.id, changes: null, detail: null });

    expect(await resetPasswordWithToken(token, { password: "another pass 789", confirm: "another pass 789" }, now)).toEqual({
      ok: false,
      error: RESET_LINK_INVALID,
    });
  });

  it("refuses an expired link", async () => {
    const member = await staff();
    const { token } = await requestToken(member.email);
    const expired = new Date(now.getTime() + RESET_TOKEN_TTL_MS);
    expect(await isResetLinkValid(token, expired)).toBe(false);
    expect(await resetPasswordWithToken(token, passwords, expired)).toEqual({ ok: false, error: RESET_LINK_INVALID });
  });

  it("refuses a made-up or missing token", async () => {
    expect(await resetPasswordWithToken("made-up", passwords, now)).toEqual({ ok: false, error: RESET_LINK_INVALID });
    expect(await resetPasswordWithToken(undefined, passwords, now)).toEqual({ ok: false, error: RESET_LINK_INVALID });
  });

  it("refuses a link once the account is deactivated", async () => {
    const member = await staff();
    const { token } = await requestToken(member.email);
    await db.staff.update({ where: { id: member.id }, data: { active: false } });
    expect(await resetPasswordWithToken(token, passwords, now)).toEqual({ ok: false, error: RESET_LINK_INVALID });
  });

  it("keeps the link usable after a validation error", async () => {
    const member = await staff();
    const { token } = await requestToken(member.email);
    expect(await resetPasswordWithToken(token, { password: NEW_PASSWORD, confirm: "different one!" }, now)).toEqual({
      ok: false,
      fieldErrors: { confirm: ["The passwords do not match."] },
    });
    expect(await resetPasswordWithToken(token, { password: OLD_PASSWORD, confirm: OLD_PASSWORD }, now)).toEqual({
      ok: false,
      fieldErrors: { password: ["Choose a password different from your current one."] },
    });
    expect(await isResetLinkValid(token, now)).toBe(true);
  });
});
