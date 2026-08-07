-- Widen the note search vector so punctuation-joined words stay findable.
--
-- The problem, measured against the real corpus: Postgres's default parser
-- classifies `apps/web/src` as one `file` token, `next.config.js` as a `host`,
-- a URL as a `url` and `<slice>` as a `tag`, and indexes each of them WHOLE.
-- Searching `apps`, `config` or `docs` therefore returned nothing even though
-- the word was plainly on screen. 197 distinct words were unreachable this way.
--
-- The fix is additive, never a replacement: the original `simple` vector is
-- kept exactly as it was, and a second vector of the same text with the
-- joining punctuation turned into spaces is concatenated onto it. So
-- `apps/web/src` is now indexed BOTH as the whole path and as `apps`, `web`,
-- `src`, and neither kind of query loses. Measured after: 197 of 197
-- recovered, with the tsvector total going from 155.7 KB to 266.8 KB.
--
-- `translate` rather than `regexp_replace`: same result, no bracket-escaping
-- ambiguity inside a character class, and unambiguously IMMUTABLE — which a
-- GENERATED column requires and Postgres refuses without.
--
-- `SET EXPRESSION` needs PostgreSQL 17 (this database is 17.6). It rewrites
-- the table and rebuilds the GIN index, so every existing row is reindexed
-- with no backfill step. On a large table that rewrite holds an ACCESS
-- EXCLUSIVE lock — fine here, worth knowing before it runs on a big corpus.
--
-- Deliberately NOT done: an `english` vector for stemming. It recovers a
-- strict subset of the above (125 of 197), and it corrupts Vietnamese —
-- `đây` stems to `đâi`, `máy` to `mái` — for a corpus that is deliberately
-- indexed with `simple` precisely because it is mixed EN/VI.
ALTER TABLE "notes"
  ALTER COLUMN "search_vector"
  SET EXPRESSION AS (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("plain_text", ''))
    ||
    to_tsvector(
      'simple',
      translate(
        coalesce("title", '') || ' ' || coalesce("plain_text", ''),
        '/._:<>()[]-',
        '           '
      )
    )
  );
