import { describe, expect, it } from "vitest";
import { hasLeft, parseLastDay } from "@/lib/resignation/schema";

const today = new Date("2032-03-10T00:00:00Z");

describe("parseLastDay", () => {
  it("treats blank as clearing the last day", () => {
    expect(parseLastDay("", today)).toEqual({ ok: true, lastDay: null });
    expect(parseLastDay(null, today)).toEqual({ ok: true, lastDay: null });
  });

  it("accepts today or a later date", () => {
    expect(parseLastDay("2032-03-10", today)).toEqual({ ok: true, lastDay: today });
    expect(parseLastDay("2032-04-01", today)).toEqual({ ok: true, lastDay: new Date("2032-04-01T00:00:00Z") });
  });

  it("refuses past and invalid dates", () => {
    expect(parseLastDay("2032-03-09", today)).toEqual({ ok: false, error: "Last day cannot be in the past." });
    expect(parseLastDay("2032-02-30", today)).toEqual({ ok: false, error: "Choose a valid date." });
    expect(parseLastDay("10/03/2032", today)).toEqual({ ok: false, error: "Choose a valid date." });
  });
});

describe("hasLeft", () => {
  it("is true only once the last day has passed", () => {
    expect(hasLeft(null, today)).toBe(false);
    expect(hasLeft(today, today)).toBe(false);
    expect(hasLeft(new Date("2032-03-09T00:00:00Z"), today)).toBe(true);
  });
});
