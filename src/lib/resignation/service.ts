import { Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isoDate, todayDate } from "@/lib/deadlines";
import type { FormState } from "@/lib/form-state";
import { checkStaffChange } from "@/lib/staff-rules";
import { parseLastDay } from "./schema";

const dateOrNull = (date: Date | null) => (date ? isoDate(date) : null);

export async function setStaffLastDay(actorId: string, id: string, input: unknown, now = new Date()): Promise<FormState> {
  const parsed = parseLastDay(input, todayDate(now));
  if (!parsed.ok) return { ok: false, fieldErrors: { lastDay: [parsed.error] } };
  const { lastDay } = parsed;

  return db.$transaction(async (tx) => {
    const before = await tx.staff.findUnique({ where: { id }, select: { active: true, lastDay: true } });
    if (!before) return { ok: false, error: "Staff member not found." };
    if (!before.active) return { ok: false, error: "This staff member is already inactive." };

    const from = dateOrNull(before.lastDay);
    const to = dateOrNull(lastDay);
    if (from === to) return { ok: true, message: "No change." };

    await tx.staff.update({ where: { id }, data: { lastDay } });
    await recordAudit(tx, {
      action: lastDay ? "STAFF_LAST_DAY_SET" : "STAFF_LAST_DAY_CLEARED",
      actorId,
      entityType: "Staff",
      entityId: id,
      changes: { lastDay: { from, to } },
    });
    return { ok: true, message: lastDay ? "Last day recorded." : "Last day cleared." };
  });
}

// Daily cron: deactivates staff whose last day is before today in Malaysia.
// History stays; inactive staff drop out of pickers and cannot log in.
// The last active Master Admin is never deactivated.
export async function deactivateLeavers(now = new Date()): Promise<number> {
  const today = todayDate(now);
  const leavers = await db.staff.findMany({
    where: { active: true, lastDay: { lt: today } },
    select: { id: true },
  });

  let deactivated = 0;
  for (const { id } of leavers) {
    const done = await db.$transaction(
      async (tx) => {
        const before = await tx.staff.findUnique({ where: { id } });
        if (!before?.active || !before.lastDay || before.lastDay >= today) return false;
        const ruleError = checkStaffChange({
          actorId: "",
          before,
          after: { role: before.role, active: false },
          activeMasterAdminCount: await tx.staff.count({ where: { role: "MASTER_ADMIN", active: true } }),
        });
        if (ruleError) return false;

        await tx.staff.update({ where: { id }, data: { active: false } });
        await recordAudit(tx, {
          action: "STAFF_DEACTIVATED",
          entityType: "Staff",
          entityId: id,
          changes: { active: { from: true, to: false } },
          detail: `Last day ${isoDate(before.lastDay)} passed`,
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (done) deactivated += 1;
  }
  return deactivated;
}
