-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('YOUR_TURN', 'NO_UPDATE_MANAGER', 'NO_UPDATE_PARTNER', 'STAGE_CHANGED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobId" TEXT,
    "kind" "NotificationKind" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientId_closedAt_idx" ON "Notification"("recipientId", "closedAt");

-- CreateIndex
CREATE INDEX "Notification_jobId_kind_closedAt_idx" ON "Notification"("jobId", "kind", "closedAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AuditJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
