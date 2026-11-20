"use server";

import type { FormState } from "@/lib/form-state";
import { requestPasswordReset } from "@/lib/password-reset/service";

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return requestPasswordReset(formData.get("email"));
}
