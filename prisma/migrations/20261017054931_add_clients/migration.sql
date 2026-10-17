-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('SDN_BHD', 'PLT', 'ENTERPRISE', 'PARTNERSHIP', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "Service" AS ENUM ('AUDIT', 'TAX', 'BOOKKEEPING', 'SECRETARIAL');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID', 'NOT_INVOICED');

-- CreateEnum
CREATE TYPE "AuditBy" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "regNo" TEXT,
    "tin" TEXT,
    "fyeDay" INTEGER NOT NULL,
    "fyeMonth" INTEGER NOT NULL,
    "incorporationDate" DATE,
    "ownerId" TEXT NOT NULL,
    "managerId" TEXT,
    "partnerId" TEXT,
    "services" "Service"[],
    "dormant" BOOLEAN NOT NULL DEFAULT false,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "prepareFormEA" BOOLEAN NOT NULL DEFAULT false,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_INVOICED',
    "auditBy" "AuditBy",
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSigningPartner" (
    "clientId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,

    CONSTRAINT "ClientSigningPartner_pkey" PRIMARY KEY ("clientId","partnerId")
);

-- CreateTable
CREATE TABLE "ExternalAuditor" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "contact" TEXT,
    "auditDeadline" DATE,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalAuditor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_regNo_key" ON "Client"("regNo");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tin_key" ON "Client"("tin");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Client_managerId_idx" ON "Client"("managerId");

-- CreateIndex
CREATE INDEX "Client_partnerId_idx" ON "Client"("partnerId");

-- CreateIndex
CREATE INDEX "Client_ownerId_idx" ON "Client"("ownerId");

-- CreateIndex
CREATE INDEX "ExternalAuditor_clientId_idx" ON "ExternalAuditor"("clientId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSigningPartner" ADD CONSTRAINT "ClientSigningPartner_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSigningPartner" ADD CONSTRAINT "ClientSigningPartner_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAuditor" ADD CONSTRAINT "ExternalAuditor_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
