"use server";

import type { FormState } from "@/lib/form-state";
import { requestPasswordReset, resetPasswordWithToken } from "@/lib/password-reset/service";

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // Links are built from the configured address, never the request's Host
  // header, so a forged request cannot point a reset link elsewhere.
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) throw new Error("NEXTAUTH_URL is not set.");
  return requestPasswordReset(formData.get("email"), { baseUrl });
}

export async function resetPasswordAction(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  return resetPasswordWithToken(token, {
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
}
