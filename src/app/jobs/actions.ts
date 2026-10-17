"use server";

import { revalidatePath } from "next/cache";
import { checkIn } from "@/lib/checkin/service";
import { requireStaff } from "@/lib/current-staff";
import type { FormState } from "@/lib/form-state";
import { stageChangeFormValues } from "@/lib/jobs/schema";
import { createAuditJob, moveAuditStage } from "@/lib/jobs/service";

export async function createAuditJobAction(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  const result = await createAuditJob(actor, clientId, { year: formData.get("year") });
  if (result.ok) revalidatePath(`/clients/${clientId}`);
  return result;
}

export async function moveAuditStageAction(jobId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  const result = await moveAuditStage(actor, jobId, stageChangeFormValues(formData));
  if (result.ok) {
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/clients", "layout");
  }
  return result;
}

export async function checkInAction(jobId: string): Promise<FormState> {
  const actor = await requireStaff();
  const result = await checkIn(actor, jobId);
  if (result.ok) {
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/clients", "layout");
  }
  return result;
}
