import type { Prisma } from "@/generated/prisma/client";
import type { AuditStage, NotificationKind } from "@/generated/prisma/enums";
import { MANAGER_ALERT_DAYS, PARTNER_ALERT_DAYS, daysSince, lastActivity } from "@/lib/checkin/activity";
import { db } from "@/lib/db";
import { stageLabel } from "@/lib/jobs/stages";
import { type JobPeople, KINDS_BY_TAB, type NotificationTab, groupByClient, turnRecipients } from "@/lib/notifications/rules";

type Tx = Prisma.TransactionClient;
type Job = { id: string; year: number; clientId: string; clientName: string };

const jobName = (job: Job) => `FY ${job.year}`;

function notify(tx: Tx, job: Job, kind: NotificationKind, recipientIds: string[], message: string) {
  if (recipientIds.length === 0) return;
  return tx.notification.createMany({
    data: recipientIds.map((recipientId) => ({ recipientId, clientId: job.clientId, jobId: job.id, kind, message })),
  });
}

function close(tx: Tx, jobId: string, kinds: NotificationKind[], now = new Date()) {
  return tx.notification.updateMany({
    where: { jobId, kind: { in: kinds }, closedAt: null },
    data: { closedAt: now },
  });
}

// Activity on a job (check-in or stage move) clears its no-update alerts.
export function closeNoUpdateAlerts(tx: Tx, jobId: string) {
  return close(tx, jobId, ["NO_UPDATE_MANAGER", "NO_UPDATE_PARTNER"]);
}

export async function notifyJobCreated(tx: Tx, actorId: string, job: Job, people: JobPeople) {
  const ids = turnRecipients(null, people).filter((id) => id !== actorId);
  await notify(tx, job, "YOUR_TURN", ids, `New audit job ${jobName(job)} — waiting for documents received.`);
}

// The old turn is done; only whoever works the new stage gets an action.
// The client's Manager hears about the move as FYI unless it is their turn.
export async function notifyStageChange(
  tx: Tx,
  actorId: string,
  job: Job,
  people: JobPeople,
  from: AuditStage | null,
  to: AuditStage,
) {
  await close(tx, job.id, ["YOUR_TURN"]);
  await closeNoUpdateAlerts(tx, job.id);

  const turn = turnRecipients(to, people).filter((id) => id !== actorId);
  await notify(tx, job, "YOUR_TURN", turn, `${jobName(job)} is at ${stageLabel(to)} — your turn.`);

  const fyi = [people.managerId].filter((id): id is string => Boolean(id) && id !== actorId && !turn.includes(id!));
  await notify(tx, job, "STAGE_CHANGED", fyi, `${jobName(job)} moved from ${stageLabel(from)} to ${stageLabel(to)}.`);
}

// WORKFLOW.md §8/§12: no update for 7 days → Manager, 21 days → Partner.
// One open alert per job and level; activity closes it.
export async function raiseNoUpdateAlerts(now = new Date()): Promise<number> {
  const jobs = await db.auditJob.findMany({
    select: {
      id: true,
      year: true,
      createdAt: true,
      client: { select: { id: true, name: true, managerId: true, partnerId: true } },
      checkIns: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      stageChanges: { orderBy: { at: "desc" }, take: 1, select: { at: true } },
      notifications: {
        where: { kind: { in: ["NO_UPDATE_MANAGER", "NO_UPDATE_PARTNER"] }, closedAt: null },
        select: { kind: true },
      },
    },
  });

  let raised = 0;
  for (const row of jobs) {
    const last = lastActivity([row.createdAt, row.checkIns[0]?.createdAt, row.stageChanges[0]?.at]) ?? row.createdAt;
    const days = daysSince(last, now);
    const open = new Set(row.notifications.map((n) => n.kind));
    const job = { id: row.id, year: row.year, clientId: row.client.id, clientName: row.client.name };
    const message = `${jobName(job)} has had no update for ${days} days.`;
    const levels: [NotificationKind, number, string | null][] = [
      ["NO_UPDATE_MANAGER", MANAGER_ALERT_DAYS, row.client.managerId],
      ["NO_UPDATE_PARTNER", PARTNER_ALERT_DAYS, row.client.partnerId],
    ];
    for (const [kind, threshold, recipientId] of levels) {
      if (days < threshold || !recipientId || open.has(kind)) continue;
      await db.notification.create({ data: { recipientId, clientId: job.clientId, jobId: job.id, kind, message } });
      raised++;
    }
  }
  return raised;
}

const openFor = (viewerId: string, tab: NotificationTab) => ({
  recipientId: viewerId,
  kind: { in: KINDS_BY_TAB[tab] },
  closedAt: null,
});

export async function openCounts(viewerId: string): Promise<Record<NotificationTab, number>> {
  const [action, fyi] = await Promise.all([
    db.notification.count({ where: openFor(viewerId, "ACTION_REQUIRED") }),
    db.notification.count({ where: openFor(viewerId, "FYI") }),
  ]);
  return { ACTION_REQUIRED: action, FYI: fyi };
}

export async function openNotifications(viewerId: string, tab: NotificationTab) {
  const rows = await db.notification.findMany({
    where: openFor(viewerId, tab),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
    select: { id: true, clientId: true, jobId: true, kind: true, message: true, createdAt: true, client: { select: { name: true } } },
  });
  return groupByClient(rows.map(({ client, ...row }) => ({ ...row, clientName: client.name })));
}

// FYI items close when read. Action items close only when the work is done.
export async function markFyiRead(viewerId: string, clientId?: string) {
  await db.notification.updateMany({
    where: { ...openFor(viewerId, "FYI"), ...(clientId ? { clientId } : {}) },
    data: { closedAt: new Date() },
  });
}
