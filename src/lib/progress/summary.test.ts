import { describe, expect, it } from "vitest";
import { summarise } from "@/lib/progress/summary";

describe("summarise", () => {
  it("counts jobs by stage, Manager turns and stale jobs", () => {
    const summary = summarise([
      { stage: null, days: 0 },
      { stage: "IN_PROGRESS", days: 7 },
      { stage: "IN_PROGRESS", days: 6 },
      { stage: "MANAGER_REVIEW", days: 21 },
      { stage: "FINAL_REVIEW", days: 1 },
      { stage: "FINALISATION", days: 2 },
      { stage: "PARTNER_REVIEW", days: 3 },
    ]);
    expect(summary.total).toBe(7);
    expect(summary.byStage.get(null)).toBe(1);
    expect(summary.byStage.get("IN_PROGRESS")).toBe(2);
    expect(summary.byStage.get("READY")).toBeUndefined();
    expect(summary.waitingOnManager).toBe(3);
    expect(summary.stale).toBe(2);
  });

  it("handles no jobs", () => {
    expect(summarise([])).toMatchObject({ total: 0, waitingOnManager: 0, stale: 0 });
  });
});
