-- AlterTable
-- Inline note images join attachments in this table rather than getting one of
-- their own: an inline image is already exactly what the model describes — a
-- file belonging to one note, stored privately, served through our own route.
-- The default keeps every existing row an attachment.
ALTER TABLE "note_documents" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'ATTACHMENT';

-- CreateIndex
-- The Files panel reads one note's ATTACHMENT rows; the inline ones must not
-- cost it a filter pass, and after the image migration they are the majority.
DROP INDEX IF EXISTS "idx_note_documents_note_created";
CREATE INDEX "idx_note_documents_note_kind_created" ON "note_documents"("note_id", "kind", "created_at" DESC);
