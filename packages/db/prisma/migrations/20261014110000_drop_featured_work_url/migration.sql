-- Homepage "Featured works": the single `url` moves to `featured_work_links`. Step 2 of 2.
--
-- Destructive: drops `featured_works.url`. Apply it only after the code that reads
-- `featured_work_links` is live, and after step 1. The guard below refuses to drop the
-- column while a stored url has no link row, so a save from the old code between the
-- two steps stops the drop instead of losing that url.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "featured_works" AS w
        WHERE w."url" IS NOT NULL
          AND w."url" <> ''
          AND NOT EXISTS (
              SELECT 1 FROM "featured_work_links" AS l WHERE l."featured_work_id" = w."id"
          )
    ) THEN
        RAISE EXCEPTION 'featured_works.url holds a url with no featured_work_links row; apply 20261014100000_add_featured_work_links first';
    END IF;
END $$;

ALTER TABLE "featured_works" DROP COLUMN IF EXISTS "url";
