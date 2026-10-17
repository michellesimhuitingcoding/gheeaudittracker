"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/current-staff";
import type { FormState } from "@/lib/form-state";
import { formText } from "@/lib/timecost/schema";
import { addPublicHoliday, removePublicHoliday, setHourlyRate } from "@/lib/timecost/service";

export async function setHourlyRateAction(staffId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  const result = await setHourlyRate(actor, staffId, { hourlyRate: formText(formData, "hourlyRate") });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function addPublicHolidayAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  const result = await addPublicHoliday(actor, { date: formText(formData, "date"), name: formText(formData, "name") });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function removePublicHolidayAction(holidayId: string): Promise<FormState> {
  const actor = await requireStaff();
  const result = await removePublicHoliday(actor, holidayId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
