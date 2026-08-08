-- CreateTable
CREATE TABLE "note_shares" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "note_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "recipient_id" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "invited_by_id" TEXT NOT NULL,

    CONSTRAINT "note_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- One grant per (note, address). Re-sharing the same pair is an upsert that
-- changes the role, not a second row that would make "which grant wins"
-- a question the resolver has to answer.
CREATE UNIQUE INDEX "note_shares_note_id_email_key" ON "note_shares"("note_id", "email");

-- CreateIndex
-- The recipient's inbox and every permission walk look grants up by address.
CREATE INDEX "idx_note_shares_email" ON "note_shares"("email");

-- AddForeignKey
-- CASCADE, so deleting a note (or a folder, whose subtree cascades already)
-- takes its grants with it and leaves nothing to clean up.
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_note_id_fkey"
  FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- SET NULL, not CASCADE: if the recipient's account goes away the grant is
-- still addressed to their email and must survive, back in its pending state.
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_recipient_id_fkey"
  FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
