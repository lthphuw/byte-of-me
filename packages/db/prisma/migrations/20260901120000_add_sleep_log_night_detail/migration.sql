-- Five nullable columns on `sleep_logs`, for the P2 phase of the daily
-- overhaul. Purely additive: ADD COLUMN only, no backfill, no rewrite of an
-- existing column, no index change. Every read and write already in production
-- keeps working unchanged, because every one of these is NULL-able and NULL is
-- what an old row means.
--
-- `IF NOT EXISTS` throughout for the same reason the table's own migration
-- carries it: this project applies migrations by hand against production
-- (`prisma db execute` + `prisma migrate resolve`), so a re-run after a partial
-- apply has to be harmless.
--
-- `rise_at` and `logged_at` are TIMESTAMP(3), matching `bed_at` / `wake_at`
-- rather than the timestamptz the design sketch named. Two reasons: `rise_at`
-- is subtracted from `bed_at`, and mixing the two types in one subtraction
-- makes the result depend on the session TimeZone; and no column anywhere in
-- this schema is timestamptz, so a lone one would drift from the Prisma model,
-- which maps a bare `DateTime` to `timestamp(3)`.

ALTER TABLE "sleep_logs"
    ADD COLUMN IF NOT EXISTS "rise_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "awakenings_count" INTEGER,
    ADD COLUMN IF NOT EXISTS "restedness" INTEGER,
    ADD COLUMN IF NOT EXISTS "nap_bucket" TEXT,
    ADD COLUMN IF NOT EXISTS "logged_at" TIMESTAMP(3);
