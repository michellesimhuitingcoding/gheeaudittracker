"use server";

import { revalidatePath } from "next/cache";
import { addAuditFirm, renameAuditFirm, setAuditFirmActive } from "@/lib/audit-firms/service";
import { requireStaff } from "@/lib/current-staff";
import type { FormState } from "@/lib/form-state";

export async function addAuditFirmAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  const result = await addAuditFirm(actor, { name: formData.get("name") });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function renameAuditFirmAction(firmId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  const result = await renameAuditFirm(actor, firmId, { name: formData.get("name") });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function setAuditFirmActiveAction(firmId: string, active: boolean): Promise<FormState> {
  const actor = await requireStaff();
  const result = await setAuditFirmActive(actor, firmId, active);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
