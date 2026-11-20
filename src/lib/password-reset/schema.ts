import { z } from "zod";
import type { Role } from "@/generated/prisma/enums";
import { normaliseEmail } from "@/lib/authenticate";
import { passwordSchema } from "@/lib/staff-schema";

// Who receives "Forgot password?" requests (they reset passwords on the staff page).
export const HANDLE_RESET_REQUESTS: readonly Role[] = ["MASTER_ADMIN"];

export const CHANGE_PASSWORD_PATH = "/account/password";

export const RESET_REQUESTED_MESSAGE =
  "If an account exists for that email, the Master Admin has been asked to reset the password. They will give you a temporary password.";
export const PASSWORD_CHANGED_MESSAGE = "Password changed.";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email()).transform(normaliseEmail),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: "Enter your current password." }).min(1, { error: "Enter your current password." }),
    password: passwordSchema,
    confirm: z.string({ error: "Type the new password again." }),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    error: "The passwords do not match.",
  });
