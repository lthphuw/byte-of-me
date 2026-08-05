-- Obsidian-style folders: a note that is a pure container. Additive only.
ALTER TABLE "notes" ADD COLUMN "is_folder" BOOLEAN NOT NULL DEFAULT false;
