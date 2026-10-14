-- Homepage "Featured works": several proof links per work, and the single `url` they
-- replace. One migration: the backfill and the drop run in the same transaction.
--
-- Destructive: drops `featured_works.url`. Apply it together with the deploy of the code
-- that reads `featured_work_links`. The public homepage reads the old column until that
-- deploy, so a request in between shows the section's error state.
--
-- Creates the table with a CHECK that caps the list at six links, the unique position key
-- and a cascading foreign key. The backfill copies each non-empty url to one link at
-- position 0, with a NOT EXISTS guard so a re-run adds nothing twice.

CREATE TABLE IF NOT EXISTS "featured_work_links" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "sort_order" INTEGER NOT NULL,
    "featured_work_id" TEXT NOT NULL,
    CONSTRAINT "featured_work_links_pkey" PRIMARY KEY ("id"),
    -- The database's own backstop for the cap of six links per work.
    CONSTRAINT "featured_work_links_sort_order_check" CHECK ("sort_order" BETWEEN 0 AND 5)
);
CREATE UNIQUE INDEX IF NOT EXISTS "featured_work_links_featured_work_id_sort_order_key"
    ON "featured_work_links"("featured_work_id", "sort_order");

DO $$
BEGIN
    ALTER TABLE "featured_work_links" ADD CONSTRAINT "featured_work_links_featured_work_id_fkey"
        FOREIGN KEY ("featured_work_id") REFERENCES "featured_works"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "featured_work_links" ("id", "created_at", "updated_at", "url", "label", "sort_order", "featured_work_id")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, w."url", NULL, 0, w."id"
FROM "featured_works" AS w
WHERE w."url" IS NOT NULL
  AND w."url" <> ''
  AND NOT EXISTS (
      SELECT 1 FROM "featured_work_links" AS l WHERE l."featured_work_id" = w."id"
  );

ALTER TABLE "featured_works" DROP COLUMN IF EXISTS "url";
