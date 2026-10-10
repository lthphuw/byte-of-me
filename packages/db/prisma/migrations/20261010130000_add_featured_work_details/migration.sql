-- Homepage "Featured works": optional expandable details per language, a stringified
-- TipTap document. Nullable and additive: existing rows read as NULL, and the add is
-- metadata-only on Postgres. IF NOT EXISTS keeps a re-run harmless, like its predecessor.
ALTER TABLE "featured_work_translations" ADD COLUMN IF NOT EXISTS "details" TEXT;
