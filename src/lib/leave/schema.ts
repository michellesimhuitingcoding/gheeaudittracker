import { z } from "zod";
import { isoDate } from "@/lib/deadlines";
import { STANDARD_HOURS_PER_DAY } from "@/lib/timecost/utilisation";

// Longest range one booking can cover, in calendar days.
export const MAX_LEAVE_SPAN_DAYS = 60;

const DAY = 86_400_000;

const dateText = (value: string | undefined): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || isoDate(date) !== value ? null : date;
};

// A whole-day booking covers every working day from `from` to `to`; a part-day
// booking is a number of hours on one date. Output hours are per date.
export const leaveSchema = z
  .object({
    staffId: z.string({ error: "Choose a staff member." }).min(1, { error: "Choose a staff member." }),
    from: z.string().optional(),
    to: z.string().optional(),
    length: z.enum(["FULL", "PART"], { error: "Choose whole day or part day." }),
    hours: z.string().optional(),
    note: z
      .string()
      .trim()
      .max(500, { error: "Note is too long." })
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .transform((input, ctx) => {
    const from = dateText(input.from);
    if (!from) {
      ctx.addIssue({ code: "custom", path: ["from"], message: "Choose a date." });
      return z.NEVER;
    }
    const to = input.to ? dateText(input.to) : from;
    if (!to) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "Choose a valid end date." });
      return z.NEVER;
    }
    if (to < from) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "End date cannot be before the start date." });
      return z.NEVER;
    }
    if ((to.getTime() - from.getTime()) / DAY + 1 > MAX_LEAVE_SPAN_DAYS) {
      ctx.addIssue({ code: "custom", path: ["to"], message: `Book at most ${MAX_LEAVE_SPAN_DAYS} days at a time.` });
      return z.NEVER;
    }

    if (input.length === "FULL") {
      return { staffId: input.staffId, from, to, hours: STANDARD_HOURS_PER_DAY, note: input.note };
    }
    if (to.getTime() !== from.getTime()) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "Part-day leave is for one date only." });
      return z.NEVER;
    }
    const hours = Number(input.hours?.trim() || Number.NaN);
    if (!Number.isFinite(hours) || hours <= 0) {
      ctx.addIssue({ code: "custom", path: ["hours"], message: "Enter the hours away." });
      return z.NEVER;
    }
    if (hours >= STANDARD_HOURS_PER_DAY) {
      ctx.addIssue({ code: "custom", path: ["hours"], message: "For a whole day, choose Whole day." });
      return z.NEVER;
    }
    if (!Number.isInteger(hours * 2)) {
      ctx.addIssue({ code: "custom", path: ["hours"], message: "Use steps of half an hour." });
      return z.NEVER;
    }
    return { staffId: input.staffId, from, to, hours, note: input.note };
  });

export type LeaveInput = z.infer<typeof leaveSchema>;

export function leaveFormValues(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };
  return {
    staffId: text("staffId"),
    from: text("from"),
    to: text("to"),
    length: text("length"),
    hours: text("hours"),
    note: text("note"),
  };
}
