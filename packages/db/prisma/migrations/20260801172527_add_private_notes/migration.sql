-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "plain_text" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "parent_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_links" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,

    CONSTRAINT "note_links_pkey" PRIMARY KEY ("source_id","target_id")
);

-- CreateTable
CREATE TABLE "note_labels" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "note_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_on_labels" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,

    CONSTRAINT "note_on_labels_pkey" PRIMARY KEY ("note_id","label_id")
);

-- CreateIndex
CREATE INDEX "idx_notes_owner_id_parent_id_position" ON "notes"("owner_id", "parent_id", "position");

-- CreateIndex
CREATE INDEX "idx_notes_owner_id_updated_at" ON "notes"("owner_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_note_links_target_id" ON "note_links"("target_id");

-- CreateIndex
CREATE UNIQUE INDEX "note_labels_owner_id_name_key" ON "note_labels"("owner_id", "name");

-- CreateIndex
CREATE INDEX "idx_note_on_labels_label_id" ON "note_on_labels"("label_id");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_labels" ADD CONSTRAINT "note_labels_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_on_labels" ADD CONSTRAINT "note_on_labels_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_on_labels" ADD CONSTRAINT "note_on_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "note_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
