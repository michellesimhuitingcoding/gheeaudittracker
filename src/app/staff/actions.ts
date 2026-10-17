"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/current-staff";
import type { FormState } from "@/lib/form-state";
import { createStaff, resetStaffPassword, setStaffActive, updateStaff } from "@/lib/staff-service";

const MANAGE_STAFF = ["MASTER_ADMIN"] as const;

function details(formData: FormData) {
  return {
    staffId: formData.get("staffId"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  };
}

export async function createStaffAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff(MANAGE_STAFF);
  const result = await createStaff(actor.id, { ...details(formData), password: formData.get("password") });
  if (result?.ok) revalidatePath("/staff", "layout");
  return result;
}

export async function updateStaffAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff(MANAGE_STAFF);
  const result = await updateStaff(actor.id, id, details(formData));
  if (result?.ok) revalidatePath("/staff", "layout");
  return result;
}

export async function setStaffActiveAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff(MANAGE_STAFF);
  const result = await setStaffActive(actor.id, id, formData.get("active") === "true");
  if (result?.ok) revalidatePath("/staff", "layout");
  return result;
}

export async function resetPasswordAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff(MANAGE_STAFF);
  const result = await resetStaffPassword(actor.id, id, formData.get("password"));
  if (result?.ok) revalidatePath("/staff", "layout");
  return result;
}
