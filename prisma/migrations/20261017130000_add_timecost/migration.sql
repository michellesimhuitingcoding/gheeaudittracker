-- AlterTable
ALTER TABLE "AuditJob" ADD COLUMN     "budgetCost" DECIMAL(12,2),
ADD COLUMN     "budgetHours" DECIMAL(8,2);

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "hourlyRate" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicHoliday_date_key" ON "PublicHoliday"("date");
