"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/current-staff";
import type { FormState } from "@/lib/form-state";
import { timesheetFormValues } from "@/lib/timesheet/schema";
import { addTimesheetEntry, removeTimesheetEntry, updateTimesheetEntry } from "@/lib/timesheet/service";

export async function addTimesheetEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  const result = await addTimesheetEntry(actor, timesheetFormValues(formData));
  if (result.ok) revalidatePath("/timesheet");
  return result;
}

export async function updateTimesheetEntryAction(entryId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  const result = await updateTimesheetEntry(actor, entryId, timesheetFormValues(formData));
  if (result.ok) revalidatePath("/timesheet");
  return result;
}

export async function removeTimesheetEntryAction(entryId: string): Promise<FormState> {
  const actor = await requireStaff();
  const result = await removeTimesheetEntry(actor, entryId);
  if (result.ok) revalidatePath("/timesheet");
  return result;
}
