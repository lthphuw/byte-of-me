/**
 * The controlled vocabularies the gym log is built on: muscles, equipment and
 * set metrics.
 *
 * ONE definition, three consumers — the seed that writes the starter catalogue
 * straight into production, the Zod schema that validates what the exercise
 * form saves, and the UI that renders the filters. They existed as three hand-
 * synchronised copies for exactly one commit, and in that commit they had
 * already drifted on five codes: the seed wrote `back` and `core` while the
 * app's schema expected `upper_back` / `lower_back` / `abs` / `obliques`.
 *
 * That drift does not fail loudly. Seeded rows read back fine, quietly vanish
 * from the muscle filter, and reject the first time the owner opens the edit
 * form — with nothing on screen naming the cause. A shared const makes the
 * mismatch a type error at build time instead.
 *
 * It lives HERE, beside `types.ts`, and not in `index.ts`: that entry point
 * runs `dotenv/config`, throws when `DATABASE_URL` is missing and constructs a
 * `PrismaClient` at module scope. A browser component importing a list of
 * muscle names must not drag any of that in. This file has no imports and no
 * side effects at all.
 */

/**
 * `back` is rows and spinal erectors; `lats` is the vertical pull. They are
 * split because programming treats them separately, and merged elsewhere they
 * would make "sets per muscle per week" answer a question nobody asked.
 */
export const MUSCLES = [
  'chest',
  'back',
  'lats',
  'traps',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'adductors',
  'abductors',
] as const;

export type Muscle = (typeof MUSCLES)[number];

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
] as const;

export type Equipment = (typeof EQUIPMENT)[number];

/**
 * What a set of this exercise is even made of. Volume and e1RM read this to
 * decide which formula applies, so a wrong value here produces a wrong NUMBER
 * rather than a visible error: a plank has no reps, a pull-up no external load.
 */
export const METRICS = [
  'weight_reps',
  'bodyweight_reps',
  'weighted_bodyweight',
  'time',
] as const;

export type Metric = (typeof METRICS)[number];
