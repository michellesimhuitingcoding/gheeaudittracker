import { z } from "zod";
import { AuditStage } from "@/generated/prisma/enums";

const note = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, { error: `${label} is required.` })
    .max(2000, { error: `${label} is too long.` });

// WORKFLOW.md §7 stage change gate.
export const stageChangeSchema = z.object({
  // The stage the form was showing, so two people cannot move the job at once.
  fromStage: z
    .enum(AuditStage)
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  progressNote: note("Progress note"),
  hours: z.coerce
    .number({ error: "Enter the hours spent." })
    .gt(0, { error: "Hours must be more than 0." })
    .max(999.99, { error: "Hours must be under 1,000." })
    .refine((hours) => Math.abs(hours * 100 - Math.round(hours * 100)) < 1e-6, {
      error: "Use at most 2 decimal places.",
    }),
  nextAction: note("Next action"),
  reviewNote: z
    .string()
    .trim()
    .max(2000, { error: "Review note is too long." })
    .optional()
    .transform((value) => (value ? value : null)),
});

export const createJobSchema = z.object({
  year: z.coerce
    .number({ error: "Enter the financial year." })
    .int({ error: "Enter the financial year." })
    .min(2000, { error: "Enter a year from 2000." })
    .max(2100, { error: "Enter a year up to 2100." }),
});

export function stageChangeFormValues(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };
  return {
    fromStage: text("fromStage") ?? "",
    progressNote: text("progressNote"),
    hours: text("hours"),
    nextAction: text("nextAction"),
    reviewNote: text("reviewNote"),
  };
}
