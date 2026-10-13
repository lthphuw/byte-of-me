-- Featured works are always published, and their text is the details body alone.
-- Destructive, unlike its predecessors: drops `featured_works.is_published` and
-- every `featured_work_translations.description`. Applied by hand against production.
DROP INDEX IF EXISTS "idx_featured_works_public_list";
CREATE INDEX IF NOT EXISTS "idx_featured_works_public_list"
    ON "featured_works"("user_id", "sort_order");

ALTER TABLE "featured_works" DROP COLUMN IF EXISTS "is_published";
ALTER TABLE "featured_work_translations" DROP COLUMN IF EXISTS "description";
