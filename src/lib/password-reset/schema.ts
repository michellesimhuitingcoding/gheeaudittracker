import { z } from "zod";
import { normaliseEmail } from "@/lib/authenticate";
import { passwordSchema } from "@/lib/staff-schema";

export const RESET_REQUESTED_MESSAGE =
  "If an account exists for that email, we've sent a link to reset the password. The link works for one hour.";
export const RESET_LINK_INVALID = "This reset link is invalid or has expired. Request a new one.";
export const RESET_DONE_MESSAGE = "Password reset — log in with your new password.";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email()).transform(normaliseEmail),
});

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string({ error: "Type the new password again." }),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    error: "The passwords do not match.",
  });
