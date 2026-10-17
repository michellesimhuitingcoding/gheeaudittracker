-- CreateEnum
CREATE TYPE "TimesheetLock" AS ENUM ('OPEN', 'REVIEWED', 'BILLED');

-- AlterTable
ALTER TABLE "AuditJob" ADD COLUMN     "frozenCost" DECIMAL(12,2),
ADD COLUMN     "frozenHours" DECIMAL(8,2),
ADD COLUMN     "frozenUnratedHours" DECIMAL(8,2),
ADD COLUMN     "timesheetBilledAt" TIMESTAMP(3),
ADD COLUMN     "timesheetBilledById" TEXT,
ADD COLUMN     "timesheetLock" "TimesheetLock" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "timesheetReviewedAt" TIMESTAMP(3),
ADD COLUMN     "timesheetReviewedById" TEXT;

-- AddForeignKey
ALTER TABLE "AuditJob" ADD CONSTRAINT "AuditJob_timesheetReviewedById_fkey" FOREIGN KEY ("timesheetReviewedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditJob" ADD CONSTRAINT "AuditJob_timesheetBilledById_fkey" FOREIGN KEY ("timesheetBilledById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
