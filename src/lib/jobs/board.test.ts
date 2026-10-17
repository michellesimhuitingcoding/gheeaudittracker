import { describe, expect, it } from "vitest";
import { BOARD_COLUMNS, boardColumns } from "@/lib/jobs/board";

const job = (id: string, stage: Parameters<typeof boardColumns>[0][number]["stage"], day: number) => ({
  id,
  stage,
  lastActivity: new Date(Date.UTC(2026, 0, day)),
});

describe("boardColumns", () => {
  it("has a not-started column then the 9 stages in order", () => {
    expect(BOARD_COLUMNS).toHaveLength(10);
    expect(BOARD_COLUMNS[0]).toBe("NOT_STARTED");
    expect(BOARD_COLUMNS[1]).toBe("DOCUMENTS_RECEIVED");
    expect(BOARD_COLUMNS[9]).toBe("FINALISATION");
  });

  it("puts each job in its stage column, stalest first, and keeps empty columns", () => {
    const columns = boardColumns([
      job("a", "IN_PROGRESS", 5),
      job("b", null, 3),
      job("c", "IN_PROGRESS", 1),
    ]);
    expect(columns.get("NOT_STARTED")!.map((j) => j.id)).toEqual(["b"]);
    expect(columns.get("IN_PROGRESS")!.map((j) => j.id)).toEqual(["c", "a"]);
    expect(columns.get("FINALISATION")).toEqual([]);
  });
});
