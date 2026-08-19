-- Indexes for the reads the dashboard and the notes vault run on every request.
-- CONCURRENTLY throughout: these run against a live database, and a plain
-- CREATE INDEX takes a lock that blocks writes to the table for its duration.
-- CONCURRENTLY cannot run inside a transaction block, so this file must be
-- applied statement by statement (`prisma db execute` sends it unwrapped).

-- notes ----------------------------------------------------------------------

-- Every list read asks for `_count: { children }`. Prisma resolves a relation
-- count as a predicate on the FK alone, and idx_notes_owner_id_parent_id_position
-- leads with owner_id, so it could not serve it: one full scan per list request.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notes_parent_id"
  ON "notes" ("parent_id");

-- The trash view: archived_at IS NOT NULL, ordered by archived_at DESC, id.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notes_owner_archived"
  ON "notes" ("owner_id", "archived_at" DESC, "id");

-- One tree level. The order leads with is_pinned, so the position index
-- supplied rows but never the ordering.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notes_owner_parent_pinned"
  ON "notes" ("owner_id", "parent_id", "is_pinned" DESC, "position");

-- The flat view's default `updated` sort. The `created` and `title` sorts are
-- deliberately left unindexed: three more indexes on the app's hottest write
-- table is a worse trade than sorting one page in memory.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notes_owner_flat_updated"
  ON "notes" ("owner_id", "is_folder", "is_pinned" DESC, "updated_at" DESC);

-- groupBy(['status']) behind the grouped view's section headers.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notes_owner_status"
  ON "notes" ("owner_id", "is_folder", "status");

-- blog_view_logs -------------------------------------------------------------

-- The dashboard's 30-day rollup filters on created_at alone and the all-time
-- total counts the table; every existing index leads with blog_id, so neither
-- could use one. This is the fastest-growing table in the schema.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_blog_view_logs_created_at"
  ON "blog_view_logs" ("created_at" DESC);

-- comments -------------------------------------------------------------------

-- The moderation list orders by recency across every blog and project.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comments_created_at"
  ON "comments" ("created_at" DESC);

-- media ----------------------------------------------------------------------

-- Paged by owner, newest first. Supersedes idx_media_user_id, which is a
-- proper prefix of this one and is dropped below.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_media_user_created_at"
  ON "media" ("user_id", "created_at" DESC);

DROP INDEX CONCURRENTLY IF EXISTS "idx_media_user_id";

-- projects -------------------------------------------------------------------

-- The admin list is by owner, newest first. idx_projects_public_list has
-- is_published second and serves the public list instead.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_user_created_at"
  ON "projects" ("user_id", "created_at" DESC);

-- tags -----------------------------------------------------------------------

-- The admin list is a single unscoped page ordered by recency; tags had no
-- index at all, so both the page and its count scanned the table.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tags_created_at"
  ON "tags" ("created_at" DESC);

-- interactions ---------------------------------------------------------------

-- groupBy(['type']) with no filter, behind the analytics like/clap totals.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_interactions_type"
  ON "interactions" ("type");
