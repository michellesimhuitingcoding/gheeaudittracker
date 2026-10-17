import { describe, expect, it } from "vitest";
import { weekInMyt } from "@/lib/team/week";

describe("weekInMyt", () => {
  it("runs Monday to the next Monday", () => {
    // Saturday 17 Oct 2026, 11am MYT.
    const { start, end } = weekInMyt(new Date("2026-10-17T03:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });

  it("uses the Malaysian date, not UTC", () => {
    // Sunday 18 Oct 2026 23:00 UTC is already Monday 19 Oct in MYT.
    const { start } = weekInMyt(new Date("2026-10-18T23:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });

  it("treats Sunday as the end of the week", () => {
    const { start } = weekInMyt(new Date("2026-10-18T03:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-12T00:00:00.000Z");
  });
});
