import { describe, expect, it } from "vitest";
import { generateResetToken, hashResetToken, isResetTokenUsable, RESET_PATH, resetLink } from "./token";

describe("reset tokens", () => {
  it("generates a long random token and stores only its hash", () => {
    const first = generateResetToken();
    const second = generateResetToken();
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashResetToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });

  it("builds the link on the configured address", () => {
    expect(resetLink("http://192.168.0.135:3000", "abc_-1")).toBe(
      `http://192.168.0.135:3000${RESET_PATH}?token=abc_-1`,
    );
  });

  it("is usable only while unused and before it expires", () => {
    const now = new Date("2032-01-01T10:00:00Z");
    const later = new Date("2032-01-01T11:00:00Z");
    expect(isResetTokenUsable({ expiresAt: later, usedAt: null }, now)).toBe(true);
    expect(isResetTokenUsable({ expiresAt: later, usedAt: now }, now)).toBe(false);
    expect(isResetTokenUsable({ expiresAt: now, usedAt: null }, now)).toBe(false);
  });
});
