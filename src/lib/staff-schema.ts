import { z } from "zod";
import { Role } from "@/generated/prisma/enums";
import { normaliseEmail } from "@/lib/authenticate";

export const MIN_PASSWORD_LENGTH = 12;

const required = (label: string) =>
  z.string({ error: `${label} is required.` }).trim().min(1, { error: `${label} is required.` });

export const passwordSchema = z
  .string({ error: "Password is required." })
  .min(MIN_PASSWORD_LENGTH, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
  .max(200, { error: "Password is too long." });

export const staffDetailsSchema = z.object({
  staffId: required("Staff ID").max(50, { error: "Staff ID is too long." }),
  name: required("Name").max(200, { error: "Name is too long." }),
  email: required("Email")
    .pipe(z.email({ error: "Enter a valid email address." }))
    .transform(normaliseEmail),
  role: z.enum(Role, { error: "Choose a role." }),
});

export const createStaffSchema = staffDetailsSchema.extend({ password: passwordSchema });

export type StaffDetails = z.infer<typeof staffDetailsSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
