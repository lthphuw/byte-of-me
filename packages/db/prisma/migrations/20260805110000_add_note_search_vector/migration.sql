-- Generated column + GIN index for note full-text search. Additive only.
-- 'simple' config: mixed EN/VI corpus — no language stemming.
ALTER TABLE "notes" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("plain_text", ''))
) STORED;

CREATE INDEX "idx_notes_search_vector" ON "notes" USING GIN ("search_vector");
