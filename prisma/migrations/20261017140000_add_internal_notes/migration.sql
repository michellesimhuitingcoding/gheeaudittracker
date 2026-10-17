-- CreateTable
CREATE TABLE "InternalNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalNote_clientId_createdAt_idx" ON "InternalNote"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalNote_jobId_createdAt_idx" ON "InternalNote"("jobId", "createdAt");

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AuditJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Internal notes are append-only (WORKFLOW.md §9). Reject any UPDATE,
-- DELETE or TRUNCATE, including from the application itself.
CREATE FUNCTION internal_note_reject_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'InternalNote is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER internal_note_no_update_delete
  BEFORE UPDATE OR DELETE ON "InternalNote"
  FOR EACH ROW EXECUTE FUNCTION internal_note_reject_change();

CREATE TRIGGER internal_note_no_truncate
  BEFORE TRUNCATE ON "InternalNote"
  FOR EACH STATEMENT EXECUTE FUNCTION internal_note_reject_change();
