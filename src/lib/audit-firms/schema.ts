import { z } from "zod";
import type { Role } from "@/generated/prisma/enums";

// WORKFLOW.md §4 settings edit: only the Master Admin changes firm settings.
export const MANAGE_AUDIT_FIRMS: readonly Role[] = ["MASTER_ADMIN"];

export const auditFirmSchema = z.object({
  name: z
    .string({ error: "Firm name is required." })
    .trim()
    .min(1, { error: "Firm name is required." })
    .max(200, { error: "Firm name is too long." })
    .transform((name) => name.replace(/\s+/g, " ")),
});
