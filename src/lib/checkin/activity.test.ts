import { describe, expect, it } from "vitest";
import { activityAlert, activityBadge, canCheckIn, daysSince, lastActivity } from "@/lib/checkin/activity";

describe("daysSince", () => {
  it("counts Malaysian calendar days", () => {
    const now = new Date("2026-10-17T02:00:00Z"); // 10:00 MYT
    expect(daysSince(new Date("2026-10-16T17:00:00Z"), now)).toBe(0); // 01:00 MYT same day
    expect(daysSince(new Date("2026-10-16T15:00:00Z"), now)).toBe(1); // 23:00 MYT previous day
    expect(daysSince(new Date("2026-10-10T02:00:00Z"), now)).toBe(7);
  });
});

describe("activityBadge", () => {
  it("is green today, plain for 1–2 days, yellow 3–6, red 7+", () => {
    expect(activityBadge(0)).toBe("green");
    expect(activityBadge(1)).toBeNull();
    expect(activityBadge(2)).toBeNull();
    expect(activityBadge(3)).toBe("yellow");
    expect(activityBadge(6)).toBe("yellow");
    expect(activityBadge(7)).toBe("red");
    expect(activityBadge(30)).toBe("red");
  });
});

describe("activityAlert", () => {
  it("alerts the Manager at 7 days and the Partner at 21", () => {
    expect(activityAlert(6)).toBeNull();
    expect(activityAlert(7)).toBe("MANAGER");
    expect(activityAlert(20)).toBe("MANAGER");
    expect(activityAlert(21)).toBe("PARTNER");
  });
});

describe("lastActivity", () => {
  it("picks the latest date and ignores missing ones", () => {
    const a = new Date("2026-10-01");
    const b = new Date("2026-10-05");
    expect(lastActivity([a, null, b, undefined])).toEqual(b);
    expect(lastActivity([])).toBeNull();
  });
});

describe("canCheckIn", () => {
  it("allows audit staff only", () => {
    expect(canCheckIn("JUNIOR")).toBe(true);
    expect(canCheckIn("PARTNER")).toBe(true);
    expect(canCheckIn("ADMIN")).toBe(false);
    expect(canCheckIn("SECRETARIAL")).toBe(false);
  });
});
