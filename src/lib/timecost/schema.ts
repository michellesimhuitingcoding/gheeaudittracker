import { z } from "zod";
import { isoDate } from "@/lib/deadlines";

// An optional amount with at most 2 decimal places; blank clears it.
const optionalAmount = (label: string, max: number) =>
  z
    .string()
    .optional()
    .transform((value, ctx) => {
      const text = value?.trim() ?? "";
      if (text === "") return null;
      const amount = Number(text);
      if (!Number.isFinite(amount)) {
        ctx.addIssue({ code: "custom", message: `Enter ${label} as a number.` });
        return z.NEVER;
      }
      if (amount < 0) {
        ctx.addIssue({ code: "custom", message: `${label[0].toUpperCase()}${label.slice(1)} cannot be negative.` });
        return z.NEVER;
      }
      if (amount > max) {
        ctx.addIssue({ code: "custom", message: `${label[0].toUpperCase()}${label.slice(1)} is too large.` });
        return z.NEVER;
      }
      if (Math.abs(amount * 100 - Math.round(amount * 100)) >= 1e-6) {
        ctx.addIssue({ code: "custom", message: "Use at most 2 decimal places." });
        return z.NEVER;
      }
      return amount;
    });

export const hourlyRateSchema = z.object({ hourlyRate: optionalAmount("the hourly rate", 99_999.99) });

export const jobBudgetSchema = z.object({
  budgetHours: optionalAmount("budget hours", 99_999.99),
  budgetCost: optionalAmount("budget cost", 999_999_999.99),
});

export const publicHolidaySchema = z.object({
  date: z
    .string({ error: "Choose a date." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Choose a date." })
    .transform((value, ctx) => {
      const date = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(date.getTime()) || isoDate(date) !== value) {
        ctx.addIssue({ code: "custom", message: "Enter a valid date." });
        return z.NEVER;
      }
      return date;
    }),
  name: z
    .string({ error: "Name is required." })
    .trim()
    .min(1, { error: "Name is required." })
    .max(200, { error: "Name is too long." }),
});

export function formText(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}
