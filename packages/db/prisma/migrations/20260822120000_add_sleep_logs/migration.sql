-- Manual sleep logging for the /space health module.
--
-- `local_date` is a DATE, not a timestamp, and it holds the date of WAKING.
-- A sleep from 23:40 to 07:10 belongs to the morning it ends. Pinning the
-- convention at write time is what lets sleep and workout rows be joined on
-- this column later without migrating either table.
--
-- Purely additive: CREATE only, no ALTER against any existing table. This
-- project applies migrations by hand against production (`prisma db execute`
-- + `prisma migrate resolve`), so additive-only is what makes that safe, and
-- `IF NOT EXISTS` throughout is what makes a re-run after a partial apply
-- harmless.

CREATE TABLE IF NOT EXISTS "sleep_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "local_date" DATE NOT NULL,
    "bed_at" TIMESTAMP(3) NOT NULL,
    "wake_at" TIMESTAMP(3) NOT NULL,
    "latency_min" INTEGER,
    "awakenings_min" INTEGER,
    "quality" INTEGER,
    "note" TEXT,
    "is_free_day" BOOLEAN NOT NULL DEFAULT false,
    "factors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "sleep_logs_pkey" PRIMARY KEY ("id")
);

-- One record per owner per day. This is what lets the write be an upsert
-- rather than a select-then-insert with a race in the middle, and it also
-- serves every range read: the screens ask for one owner's window of days,
-- which this index leads with.
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_sleep_logs_owner_date"
    ON "sleep_logs"("owner_id", "local_date");

DO $$
BEGIN
    ALTER TABLE "sleep_logs"
        ADD CONSTRAINT "sleep_logs_owner_id_fkey"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
