-- AlterTable: additive only — both columns have safe defaults for existing rows.
ALTER TABLE "notes" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "notes" ADD COLUMN "properties" JSONB;
