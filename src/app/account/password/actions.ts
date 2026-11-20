"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/current-staff";
import type { FormState } from "@/lib/form-state";
import { changeOwnPassword } from "@/lib/password-reset/service";

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff(undefined, { passwordChange: true });
  const result = await changeOwnPassword(staff.id, {
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (result?.ok) revalidatePath("/", "layout");
  return result;
}
