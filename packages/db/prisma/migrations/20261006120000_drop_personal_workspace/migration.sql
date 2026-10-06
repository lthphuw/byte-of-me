-- Drops the personal workspace (notes, note sharing, sleep, gym, day journal)
-- when the app was trimmed down to the public portfolio + CMS.
--
-- IRREVERSIBLE: every row in these tables is lost. `workspace_settings` is NOT
-- dropped — the media library still reads its image-compression config.
--
-- Children before parents so no FK blocks a drop, and `IF EXISTS` throughout:
-- this project applies migrations by hand against production
-- (`prisma db execute` + `prisma migrate resolve`), so a re-run after a partial
-- apply has to be harmless. The `notes.search_vector` generated column and its
-- GIN index go with the table; none of these migrations created a type,
-- function or trigger.

-- Day journal
DROP TABLE IF EXISTS "day_photos";
DROP TABLE IF EXISTS "day_entries";

-- Gym log
DROP TABLE IF EXISTS "workout_sets";
DROP TABLE IF EXISTS "workout_exercises";
DROP TABLE IF EXISTS "workout_sessions";
DROP TABLE IF EXISTS "routine_exercises";
DROP TABLE IF EXISTS "routines";
DROP TABLE IF EXISTS "exercises";

-- Sleep
DROP TABLE IF EXISTS "sleep_logs";

-- Notes
DROP TABLE IF EXISTS "note_shares";
DROP TABLE IF EXISTS "note_documents";
DROP TABLE IF EXISTS "note_on_labels";
DROP TABLE IF EXISTS "note_labels";
DROP TABLE IF EXISTS "note_links";
DROP TABLE IF EXISTS "notes";
