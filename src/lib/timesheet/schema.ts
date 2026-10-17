import { z } from "zod";
import { TimesheetCategory } from "@/generated/prisma/enums";
import { todayInMyt } from "@/lib/format";

// Most hours a person can log across one day.
export const MAX_HOURS_PER_DAY = 24;

export const timesheetEntrySchema = z
  .object({
    date: z
      .string({ error: "Choose a date." })
      .transform((value, ctx) => {
        const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
        if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
          ctx.addIssue({ code: "custom", message: "Choose a date." });
          return z.NEVER;
        }
        if (value > todayInMyt()) {
          ctx.addIssue({ code: "custom", message: "You cannot log time for a future date." });
          return z.NEVER;
        }
        return date;
      }),
    category: z.enum(TimesheetCategory, { error: "Choose a category." }),
    jobId: z
      .string()
      .optional()
      .transform((value) => (value ? value : null)),
    hours: z.coerce
      .number({ error: "Enter the hours." })
      .gt(0, { error: "Hours must be more than 0." })
      .max(MAX_HOURS_PER_DAY, { error: `Hours cannot be more than ${MAX_HOURS_PER_DAY}.` })
      .refine((hours) => Math.abs(hours * 100 - Math.round(hours * 100)) < 1e-6, {
        error: "Use at most 2 decimal places.",
      }),
    note: z
      .string()
      .trim()
      .max(2000, { error: "Note is too long." })
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .superRefine((entry, ctx) => {
    if (entry.category !== "TRAINING_CPD" && !entry.jobId) {
      ctx.addIssue({ code: "custom", path: ["jobId"], message: "Choose a job." });
    }
  })
  // Training/CPD is information only and is never charged to a job.
  .transform((entry) => (entry.category === "TRAINING_CPD" ? { ...entry, jobId: null } : entry));

export type TimesheetEntryInput = z.infer<typeof timesheetEntrySchema>;

export function timesheetFormValues(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };
  return {
    date: text("date"),
    category: text("category"),
    jobId: text("jobId"),
    hours: text("hours"),
    note: text("note"),
  };
}
