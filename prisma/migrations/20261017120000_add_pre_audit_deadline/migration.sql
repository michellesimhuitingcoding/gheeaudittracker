-- AlterTable
ALTER TABLE "AuditJob" ADD COLUMN     "preAuditDeadline" DATE,
ADD COLUMN     "preAuditDeadlineConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "preAuditDeadlineConfirmedById" TEXT;

-- CreateIndex
CREATE INDEX "AuditJob_preAuditDeadline_idx" ON "AuditJob"("preAuditDeadline");

-- AddForeignKey
ALTER TABLE "AuditJob" ADD CONSTRAINT "AuditJob_preAuditDeadlineConfirmedById_fkey" FOREIGN KEY ("preAuditDeadlineConfirmedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
