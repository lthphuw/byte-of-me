-- CreateTable
-- Files attached to a note. No `url` column, deliberately: these objects live
-- in the PRIVATE bucket and are reachable only through the app's own route,
-- which checks the session first. See the model docstring in schema.prisma.
CREATE TABLE "note_documents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "note_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "note_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- The storage key identifies the object; two rows pointing at one object would
-- make "who may delete it" unanswerable.
CREATE UNIQUE INDEX "note_documents_file_key_key" ON "note_documents"("file_key");

-- CreateIndex
-- The panel reads one note's attachments, newest first. No other axis is read.
CREATE INDEX "idx_note_documents_note_created" ON "note_documents"("note_id", "created_at" DESC);

-- AddForeignKey
-- CASCADE takes the ROW with the note but never the object in the bucket —
-- `delete-note.ts` collects the file keys before it deletes and removes the
-- objects afterwards. Without that step every deleted note leaks its files.
ALTER TABLE "note_documents" ADD CONSTRAINT "note_documents_note_id_fkey"
  FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_documents" ADD CONSTRAINT "note_documents_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
