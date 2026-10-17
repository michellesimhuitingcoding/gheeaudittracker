-- CreateTable
CREATE TABLE "JobCheckIn" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobCheckIn_jobId_createdAt_idx" ON "JobCheckIn"("jobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobCheckIn_jobId_staffId_date_key" ON "JobCheckIn"("jobId", "staffId", "date");

-- AddForeignKey
ALTER TABLE "JobCheckIn" ADD CONSTRAINT "JobCheckIn_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AuditJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCheckIn" ADD CONSTRAINT "JobCheckIn_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
