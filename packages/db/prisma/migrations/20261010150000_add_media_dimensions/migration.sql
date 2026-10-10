-- Pixel size of each stored media file, so a reader can reserve its box before the file
-- draws. Purely additive: two nullable columns, no default, no rewrite of existing rows.
-- Rows that predate this stay NULL until the one-off backfill fills them.

ALTER TABLE "media"
    ADD COLUMN IF NOT EXISTS "width" INTEGER,
    ADD COLUMN IF NOT EXISTS "height" INTEGER;
