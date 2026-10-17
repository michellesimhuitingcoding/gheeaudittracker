-- CreateEnum
CREATE TYPE "Role" AS ENUM ('JUNIOR', 'SENIOR', 'MANAGER', 'PARTNER', 'ADMIN', 'AUDIT_ADMIN_ASSISTANT', 'AUDIT_ADMIN_MANAGER', 'SECRETARIAL', 'SECRETARIAL_ASSISTANT', 'MASTER_ADMIN');

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_staffId_key" ON "Staff"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");
