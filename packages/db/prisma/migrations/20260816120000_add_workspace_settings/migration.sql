-- Per-author settings for the notes workspace.
--
-- One JSON column rather than a column per setting: the set keeps growing, and
-- a column apiece would mean a migration apiece against production. The shape
-- is validated in application code (`entities/workspace-settings`), which also
-- merges defaults, so an empty object is a complete, valid row.
--
-- `IF NOT EXISTS` throughout: this project applies migrations by hand
-- (`prisma db execute` + `prisma migrate resolve`), so a re-run after a partial
-- apply has to be harmless.

CREATE TABLE IF NOT EXISTS "workspace_settings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "owner_id" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "workspace_settings_pkey" PRIMARY KEY ("id")
);

-- One row per author. The unique index is what lets the read be an upsert
-- rather than a select-then-insert with a race in the middle.
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_settings_owner_id_key"
    ON "workspace_settings"("owner_id");

DO $$
BEGIN
    ALTER TABLE "workspace_settings"
        ADD CONSTRAINT "workspace_settings_owner_id_fkey"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
