"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CLIENT_INTAKE_ROLES } from "@/lib/clients/permissions";
import { clientFormValues, externalAuditorFormValues } from "@/lib/clients/schema";
import {
  addExternalAuditor,
  createClient,
  removeExternalAuditor,
  updateClient,
  updateExternalAuditor,
} from "@/lib/clients/service";
import { requireStaff } from "@/lib/current-staff";
import type { FormState } from "@/lib/form-state";

function refresh(result: FormState) {
  if (result?.ok) revalidatePath("/clients", "layout");
  return result;
}

export async function createClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff(CLIENT_INTAKE_ROLES);
  const result = await createClient(actor, clientFormValues(formData));
  if (!result.ok || !result.clientId) return result;
  revalidatePath("/clients", "layout");
  redirect(`/clients/${result.clientId}`);
}

export async function updateClientAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  return refresh(await updateClient(actor, id, clientFormValues(formData)));
}

export async function addExternalAuditorAction(
  clientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  return refresh(await addExternalAuditor(actor, clientId, externalAuditorFormValues(formData)));
}

export async function updateExternalAuditorAction(
  auditorId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStaff();
  return refresh(await updateExternalAuditor(actor, auditorId, externalAuditorFormValues(formData)));
}

export async function removeExternalAuditorAction(auditorId: string): Promise<FormState> {
  const actor = await requireStaff();
  return refresh(await removeExternalAuditor(actor, auditorId));
}
