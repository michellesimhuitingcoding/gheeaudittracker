-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "seniorId" TEXT;

-- CreateTable
CREATE TABLE "ClientAssignedStaff" (
    "clientId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "ClientAssignedStaff_pkey" PRIMARY KEY ("clientId","staffId")
);

-- CreateIndex
CREATE INDEX "ClientAssignedStaff_staffId_idx" ON "ClientAssignedStaff"("staffId");

-- CreateIndex
CREATE INDEX "Client_seniorId_idx" ON "Client"("seniorId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignedStaff" ADD CONSTRAINT "ClientAssignedStaff_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignedStaff" ADD CONSTRAINT "ClientAssignedStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
