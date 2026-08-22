-- Set-level gym logging for the /space/health module.
--
-- `local_date` is a DATE and holds the day the session STARTED, mirroring
-- sleep_logs (which holds the day a sleep ENDED). That asymmetry is deliberate
-- and lives in shared/lib/health/local-date.ts; it is what lets sleep and
-- training be joined on this one column later without migrating either table.
--
-- Purely additive: CREATE only, no ALTER against any existing table. Applied
-- against production, so additive-only is what makes it safe, and
-- `IF NOT EXISTS` throughout makes a re-run after a partial apply harmless.

CREATE TABLE IF NOT EXISTS "exercises" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "primary_muscle" TEXT NOT NULL,
    "secondary_muscles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "equipment" TEXT NOT NULL,
    "metric" TEXT NOT NULL DEFAULT 'weight_reps',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" TEXT NOT NULL,
    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- The constraint per-exercise statistics depend on: without it "Bench Press"
-- and "Bench press " become two separate progression curves.
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_exercises_owner_name"
    ON "exercises"("owner_id", "name");
CREATE INDEX IF NOT EXISTS "idx_exercises_owner_muscle"
    ON "exercises"("owner_id", "primary_muscle");

CREATE TABLE IF NOT EXISTS "routines" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" TEXT NOT NULL,
    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "idx_routines_owner_position"
    ON "routines"("owner_id", "is_archived", "position");

CREATE TABLE IF NOT EXISTS "routine_exercises" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "target_sets" INTEGER,
    "target_reps_low" INTEGER,
    "target_reps_high" INTEGER,
    "target_rpe" DECIMAL(3,1),
    "rest_sec" INTEGER,
    "routine_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    CONSTRAINT "routine_exercises_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "idx_routine_exercises_routine_position"
    ON "routine_exercises"("routine_id", "position");

CREATE TABLE IF NOT EXISTS "workout_sessions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "local_date" DATE NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "session_rpe" DECIMAL(3,1),
    "routine_id" TEXT,
    "owner_id" TEXT NOT NULL,
    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "idx_workout_sessions_owner_date"
    ON "workout_sessions"("owner_id", "local_date" DESC);
-- The question the app opens with: is a session still running?
CREATE INDEX IF NOT EXISTS "idx_workout_sessions_owner_open"
    ON "workout_sessions"("owner_id", "ended_at");

CREATE TABLE IF NOT EXISTS "workout_exercises" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "notes" TEXT,
    "session_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "idx_workout_exercises_session_position"
    ON "workout_exercises"("session_id", "position");
-- The index every per-exercise statistic goes through.
CREATE INDEX IF NOT EXISTS "idx_workout_exercises_exercise"
    ON "workout_exercises"("exercise_id");

CREATE TABLE IF NOT EXISTS "workout_sets" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight_kg" DECIMAL(6,2),
    "rpe" DECIMAL(3,1),
    "duration_sec" INTEGER,
    "is_warmup" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "workout_exercise_id" TEXT NOT NULL,
    CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "idx_workout_sets_exercise_position"
    ON "workout_sets"("workout_exercise_id", "position");

DO $$
BEGIN
    ALTER TABLE "exercises" ADD CONSTRAINT "exercises_owner_id_fkey"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
    ALTER TABLE "routines" ADD CONSTRAINT "routines_owner_id_fkey"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
    ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_routine_id_fkey"
        FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
    ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_exercise_id_fkey"
        FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
    ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_owner_id_fkey"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SetNull, paired with the title snapshot above: deleting a routine must not
-- blank the heading of every session that used it.
DO $$
BEGIN
    ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_routine_id_fkey"
        FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
    ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RESTRICT, not CASCADE: deleting a catalog entry must not delete the history
-- of training it.
DO $$
BEGIN
    ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_fkey"
        FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
    ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_exercise_id_fkey"
        FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
