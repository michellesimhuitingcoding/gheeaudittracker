"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/current-staff";
import type { FormState } from "@/lib/form-state";
import { leaveFormValues } from "@/lib/leave/schema";
import { addLeave, removeLeave } from "@/lib/leave/service";

export async function addLeaveAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  const result = await addLeave(actor, leaveFormValues(formData));
  if (result.ok) revalidatePath("/leave");
  return result;
}

export async function removeLeaveAction(entryId: string): Promise<FormState> {
  const actor = await requireStaff();
  const result = await removeLeave(actor, entryId);
  if (result.ok) revalidatePath("/leave");
  return result;
}
