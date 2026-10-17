-- CreateEnum
CREATE TYPE "AuditStage" AS ENUM ('DOCUMENTS_RECEIVED', 'PRE_AUDIT', 'READY', 'IN_PROGRESS', 'MANAGER_REVIEW', 'PARTNER_REVIEW', 'CLEAR_REVIEW', 'FINAL_REVIEW', 'FINALISATION');

-- CreateTable
CREATE TABLE "AuditJob" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "stage" "AuditStage",
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditStageChange" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fromStage" "AuditStage",
    "toStage" "AuditStage" NOT NULL,
    "byId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progressNote" TEXT NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL,
    "nextAction" TEXT NOT NULL,
    "reviewNote" TEXT,

    CONSTRAINT "AuditStageChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditJob_stage_idx" ON "AuditJob"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "AuditJob_clientId_year_key" ON "AuditJob"("clientId", "year");

-- CreateIndex
CREATE INDEX "AuditStageChange_jobId_at_idx" ON "AuditStageChange"("jobId", "at");

-- AddForeignKey
ALTER TABLE "AuditJob" ADD CONSTRAINT "AuditJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditJob" ADD CONSTRAINT "AuditJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditStageChange" ADD CONSTRAINT "AuditStageChange_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AuditJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditStageChange" ADD CONSTRAINT "AuditStageChange_byId_fkey" FOREIGN KEY ("byId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
