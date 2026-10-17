"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/current-staff";
import { markFyiRead } from "@/lib/notifications/service";

export async function markClientReadAction(clientId: string) {
  const viewer = await requireStaff();
  await markFyiRead(viewer.id, clientId);
  revalidatePath("/", "layout");
}

export async function markAllReadAction() {
  const viewer = await requireStaff();
  await markFyiRead(viewer.id);
  revalidatePath("/", "layout");
}
