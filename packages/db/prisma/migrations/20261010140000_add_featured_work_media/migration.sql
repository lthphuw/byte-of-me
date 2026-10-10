-- Homepage "Featured works": a side-by-side demo pair (clip or GIF) per work.
--
-- Purely additive: CREATE only, no ALTER against an existing table. Both foreign keys
-- cascade, so deleting a work or a media file removes its join row and nothing else.
-- `IF NOT EXISTS` / `duplicate_object` keep a re-run after a partial apply harmless.
-- The CHECK is the database's own backstop for "at most two": slot 0 or 1, and the
-- unique (work, slot) key leaves no room for a third row.

CREATE TABLE IF NOT EXISTS "featured_work_media" (
    "sort_order" INTEGER NOT NULL,
    "label" TEXT,
    "featured_work_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    CONSTRAINT "featured_work_media_pkey" PRIMARY KEY ("featured_work_id", "media_id"),
    CONSTRAINT "featured_work_media_sort_order_check" CHECK ("sort_order" IN (0, 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS "featured_work_media_featured_work_id_sort_order_key"
    ON "featured_work_media"("featured_work_id", "sort_order");
CREATE INDEX IF NOT EXISTS "idx_featured_work_media_media_id"
    ON "featured_work_media"("media_id");

DO $$
BEGIN
    ALTER TABLE "featured_work_media" ADD CONSTRAINT "featured_work_media_featured_work_id_fkey"
        FOREIGN KEY ("featured_work_id") REFERENCES "featured_works"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
    ALTER TABLE "featured_work_media" ADD CONSTRAINT "featured_work_media_media_id_fkey"
        FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
