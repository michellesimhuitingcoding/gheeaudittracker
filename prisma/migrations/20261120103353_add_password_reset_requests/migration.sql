-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PasswordResetRequest" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordResetRequest_resolvedAt_idx" ON "PasswordResetRequest"("resolvedAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_staffId_resolvedAt_idx" ON "PasswordResetRequest"("staffId", "resolvedAt");

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
