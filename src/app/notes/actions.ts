"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/current-staff";
import type { FormState } from "@/lib/form-state";
import { addInternalNote } from "@/lib/notes/service";

export async function addInternalNoteAction(
  clientId: string,
  jobId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  const result = await addInternalNote(actor, { clientId, jobId }, { body: formData.get("body") ?? undefined });
  if (result.ok) {
    revalidatePath(`/clients/${clientId}`);
    if (jobId) revalidatePath(`/jobs/${jobId}`);
  }
  return result;
}
