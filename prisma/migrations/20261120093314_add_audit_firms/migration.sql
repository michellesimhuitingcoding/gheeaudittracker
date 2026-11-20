-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "auditFirmId" TEXT;

-- CreateTable
CREATE TABLE "AuditFirm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditFirm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditFirm_name_key" ON "AuditFirm"("name");

-- CreateIndex
CREATE INDEX "Client_auditFirmId_idx" ON "Client"("auditFirmId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_auditFirmId_fkey" FOREIGN KEY ("auditFirmId") REFERENCES "AuditFirm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Starting firms: the firm's own practice (internal) and Wong Joo Hua (external).
INSERT INTO "AuditFirm" ("id", "name", "internal", "active", "createdAt", "updatedAt") VALUES
  ('audit_firm_internal', 'G.H. Ee & Rakan-Rakan', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('audit_firm_wong_joo_hua', 'Wong Joo Hua', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Existing clients keep their auditor: Internal -> G.H. Ee & Rakan-Rakan, External -> Wong Joo Hua.
UPDATE "Client" SET "auditFirmId" = 'audit_firm_internal' WHERE "auditBy" = 'INTERNAL';
UPDATE "Client" SET "auditFirmId" = 'audit_firm_wong_joo_hua' WHERE "auditBy" = 'EXTERNAL';
