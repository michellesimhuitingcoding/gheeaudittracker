import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createJobSchema, stageChangeSchema } from "@/lib/jobs/schema";

const valid = { fromStage: "", progressNote: " Docs in ", hours: "1.5", nextAction: " Start pre-audit " };

function errors(input: unknown) {
  const result = stageChangeSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("stage change gate", () => {
  it("accepts the three required fields", () => {
    expect(stageChangeSchema.parse(valid)).toEqual({
      fromStage: null,
      progressNote: "Docs in",
      hours: 1.5,
      nextAction: "Start pre-audit",
      reviewNote: null,
    });
  });

  it("blocks if any of the three fields is empty", () => {
    expect(Object.keys(errors({ fromStage: "", progressNote: " ", hours: "", nextAction: "" })).sort()).toEqual([
      "hours",
      "nextAction",
      "progressNote",
    ]);
  });

  it("rejects zero, negative or over-precise hours", () => {
    expect(errors({ ...valid, hours: "0" }).hours).toBeDefined();
    expect(errors({ ...valid, hours: "-2" }).hours).toBeDefined();
    expect(errors({ ...valid, hours: "1.234" }).hours).toEqual(["Use at most 2 decimal places."]);
    expect(errors({ ...valid, hours: "0.1" })).toEqual({});
  });

  it("rejects an unknown stage", () => {
    expect(errors({ ...valid, fromStage: "DONE" }).fromStage).toBeDefined();
  });
});

describe("create job", () => {
  it("needs a sensible year", () => {
    expect(createJobSchema.parse({ year: "2026" })).toEqual({ year: 2026 });
    expect(createJobSchema.safeParse({ year: "1999" }).success).toBe(false);
    expect(createJobSchema.safeParse({ year: "2026.5" }).success).toBe(false);
  });
});
