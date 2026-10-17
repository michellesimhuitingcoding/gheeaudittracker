-- CreateEnum
CREATE TYPE "TimesheetCategory" AS ENUM ('WORK', 'OT', 'TRAINING_CPD');

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "jobId" TEXT,
    "date" DATE NOT NULL,
    "hours" DECIMAL(4,2) NOT NULL,
    "category" "TimesheetCategory" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimesheetEntry_staffId_date_idx" ON "TimesheetEntry"("staffId", "date");

-- CreateIndex
CREATE INDEX "TimesheetEntry_jobId_idx" ON "TimesheetEntry"("jobId");

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AuditJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
