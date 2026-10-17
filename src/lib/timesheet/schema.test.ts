import { describe, expect, it } from "vitest";
import { z } from "zod";
import { todayInMyt } from "@/lib/format";
import { timesheetEntrySchema } from "@/lib/timesheet/schema";

const valid = { date: "2026-01-05", category: "WORK", jobId: "job1", hours: "7.5", note: " Fieldwork " };

function errors(input: unknown) {
  const result = timesheetEntrySchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("timesheet entry", () => {
  it("accepts a work entry", () => {
    expect(timesheetEntrySchema.parse(valid)).toEqual({
      date: new Date("2026-01-05T00:00:00Z"),
      category: "WORK",
      jobId: "job1",
      hours: 7.5,
      note: "Fieldwork",
    });
  });

  it("needs a job for work and overtime", () => {
    expect(errors({ ...valid, jobId: "" }).jobId).toEqual(["Choose a job."]);
    expect(errors({ ...valid, category: "OT", jobId: "" }).jobId).toEqual(["Choose a job."]);
  });

  it("never charges Training/CPD to a job", () => {
    expect(timesheetEntrySchema.parse({ ...valid, category: "TRAINING_CPD" }).jobId).toBeNull();
    expect(errors({ ...valid, category: "TRAINING_CPD", jobId: "" })).toEqual({});
  });

  it("rejects zero, over 24 or over-precise hours", () => {
    expect(errors({ ...valid, hours: "0" }).hours).toBeDefined();
    expect(errors({ ...valid, hours: "24.25" }).hours).toBeDefined();
    expect(errors({ ...valid, hours: "1.234" }).hours).toEqual(["Use at most 2 decimal places."]);
  });

  it("rejects invalid and future dates", () => {
    expect(errors({ ...valid, date: "2026-02-30" }).date).toEqual(["Choose a date."]);
    expect(errors({ ...valid, date: "9999-01-01" }).date).toEqual(["You cannot log time for a future date."]);
    expect(errors({ ...valid, date: todayInMyt() })).toEqual({});
  });

  it("rejects an unknown category", () => {
    expect(errors({ ...valid, category: "LEAVE" }).category).toBeDefined();
  });
});

describe("todayInMyt", () => {
  it("uses Malaysia time", () => {
    expect(todayInMyt(new Date("2026-03-01T16:30:00Z"))).toBe("2026-03-02");
    expect(todayInMyt(new Date("2026-03-01T15:30:00Z"))).toBe("2026-03-01");
  });
});
