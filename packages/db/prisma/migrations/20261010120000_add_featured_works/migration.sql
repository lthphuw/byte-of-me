-- Homepage "Featured works": admin-curated pieces of work (a PR, commit or post)
-- with authored title/description per language.
--
-- Purely additive: CREATE only, no ALTER against any existing table. Applied
-- against production, so additive-only is what makes it safe, and
-- `IF NOT EXISTS` throughout makes a re-run after a partial apply harmless.

CREATE TABLE IF NOT EXISTS "featured_works" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "featured_works_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "idx_featured_works_public_list"
    ON "featured_works"("user_id", "is_published", "sort_order");

CREATE TABLE IF NOT EXISTS "featured_work_translations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "featured_work_id" TEXT NOT NULL,
    CONSTRAINT "featured_work_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "featured_work_translations_featured_work_id_language_key"
    ON "featured_work_translations"("featured_work_id", "language");

DO $$
BEGIN
    ALTER TABLE "featured_works" ADD CONSTRAINT "featured_works_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
    ALTER TABLE "featured_work_translations" ADD CONSTRAINT "featured_work_translations_featured_work_id_fkey"
        FOREIGN KEY ("featured_work_id") REFERENCES "featured_works"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
