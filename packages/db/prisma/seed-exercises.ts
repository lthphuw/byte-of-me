import { prisma } from '../src';

/**
 * The starter exercise catalogue for the gym log (`/space/health`).
 *
 * Unlike `seed-notes.ts` this is NOT throwaway sample data and it is NOT
 * guarded to a local database — it is meant to be run against production once,
 * so the first real workout can be logged without typing sixty rows by hand.
 * That is exactly why every rule below is about not destroying anything:
 *
 *   - It only ever INSERTs. There is no update, no delete, no `deleteMany`
 *     wipe like seed-notes does, so a row the owner has renamed, re-tagged or
 *     archived is left exactly as it is.
 *   - A second run is a no-op: existing `(ownerId, name)` pairs are read first
 *     and filtered out, and `skipDuplicates` closes the gap between that read
 *     and the write.
 *
 * This list is a starting point, not a canonical set. The owner is expected to
 * edit it, archive what they do not do, and add what is missing. Seeding must
 * never assert itself back over those decisions.
 *
 * Run:
 *   cd packages/db && bun run prisma/seed-exercises.ts
 *
 * Against a specific owner (otherwise the first ADMIN is used):
 *   EXERCISES_OWNER_ID=<id> bun run prisma/seed-exercises.ts
 */

/**
 * The controlled vocabularies, re-exported from the one definition in
 * `packages/db/src/gym-vocabulary.ts`.
 *
 * They were duplicated here and in the app's Zod schema for exactly one commit
 * before drifting on five codes. This file writes straight into production, so
 * that drift meant rows the muscle filter could not see and the edit form could
 * not save, with nothing on screen naming the cause. Re-exported rather than
 * redefined so the seed and the validator cannot disagree again.
 */
import {
  EQUIPMENT,
  type Equipment,
  METRICS,
  type Metric,
  MUSCLES,
  type Muscle,
} from '../src/gym-vocabulary';

// Imported AND re-exported, not `export … from`: the validation below and the
// catalogue literal both READ these, and a bare re-export never binds them
// locally.
export { EQUIPMENT, METRICS, MUSCLES };
export type { Equipment, Metric, Muscle };

type SeedExercise = {
  /** English only. There is no ExerciseTranslation table, and `(ownerId, name)` is unique. */
  name: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipment: Equipment;
  metric: Metric;
};

/**
 * Ordered by movement pattern rather than alphabetically, so a gap in coverage
 * is visible while reading: squat / hinge / lunge, horizontal and vertical
 * push, horizontal and vertical pull, direct work for both arms and all three
 * delt heads, calves, core, hips.
 *
 * Band exercises carry `weight_reps` because the resistance IS recordable as a
 * number (band tension, or the band's index) and it is not the lifter's
 * bodyweight — `bodyweight_reps` would make volume multiply by body mass.
 */
const EXERCISES: SeedExercise[] = [
  // --- SQUAT / KNEE-DOMINANT ---
  {
    name: 'Back Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'adductors', 'core'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Front Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'core', 'back'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Goblet Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'core'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Leg Press',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'adductors'],
    equipment: 'machine',
    metric: 'weight_reps',
  },
  {
    name: 'Leg Extension',
    primaryMuscle: 'quads',
    secondaryMuscles: [],
    equipment: 'machine',
    metric: 'weight_reps',
  },

  // --- LUNGE / SINGLE LEG ---
  {
    name: 'Bulgarian Split Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'adductors'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Walking Lunge',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'calves'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Reverse Lunge',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },

  // --- HINGE / POSTERIOR CHAIN ---
  {
    name: 'Conventional Deadlift',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'back', 'traps', 'quads', 'forearms', 'core'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Sumo Deadlift',
    primaryMuscle: 'glutes',
    secondaryMuscles: [
      'quads',
      'hamstrings',
      'adductors',
      'back',
      'traps',
      'forearms',
    ],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Romanian Deadlift',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'back', 'forearms'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Barbell Hip Thrust',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'quads'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Kettlebell Swing',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'back', 'core', 'forearms'],
    equipment: 'kettlebell',
    metric: 'weight_reps',
  },
  {
    name: 'Seated Leg Curl',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['calves'],
    equipment: 'machine',
    metric: 'weight_reps',
  },
  {
    name: 'Lying Leg Curl',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['calves'],
    equipment: 'machine',
    metric: 'weight_reps',
  },
  {
    name: 'Back Extension',
    primaryMuscle: 'back',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'bodyweight',
    metric: 'bodyweight_reps',
  },

  // --- HORIZONTAL PUSH ---
  {
    name: 'Barbell Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['front_delts', 'triceps'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Incline Barbell Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['front_delts', 'triceps'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Dumbbell Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['front_delts', 'triceps'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Incline Dumbbell Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['front_delts', 'triceps'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Machine Chest Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['front_delts', 'triceps'],
    equipment: 'machine',
    metric: 'weight_reps',
  },
  {
    name: 'Cable Chest Fly',
    primaryMuscle: 'chest',
    secondaryMuscles: ['front_delts'],
    equipment: 'cable',
    metric: 'weight_reps',
  },
  {
    name: 'Pec Deck',
    primaryMuscle: 'chest',
    secondaryMuscles: ['front_delts'],
    equipment: 'machine',
    metric: 'weight_reps',
  },
  {
    name: 'Push-Up',
    primaryMuscle: 'chest',
    secondaryMuscles: ['front_delts', 'triceps', 'core'],
    equipment: 'bodyweight',
    metric: 'bodyweight_reps',
  },
  {
    name: 'Chest Dip',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'front_delts'],
    equipment: 'bodyweight',
    metric: 'bodyweight_reps',
  },
  {
    // Separate row from "Chest Dip" on purpose: the metric differs, and one
    // exercise cannot have two. Log the belt weight here, nothing there.
    name: 'Weighted Dip',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'front_delts'],
    equipment: 'bodyweight',
    metric: 'weighted_bodyweight',
  },

  // --- VERTICAL PUSH ---
  {
    name: 'Overhead Press',
    primaryMuscle: 'front_delts',
    secondaryMuscles: ['side_delts', 'triceps', 'core'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Seated Dumbbell Shoulder Press',
    primaryMuscle: 'front_delts',
    secondaryMuscles: ['side_delts', 'triceps'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Machine Shoulder Press',
    primaryMuscle: 'front_delts',
    secondaryMuscles: ['side_delts', 'triceps'],
    equipment: 'machine',
    metric: 'weight_reps',
  },
  {
    name: 'Pike Push-Up',
    primaryMuscle: 'front_delts',
    secondaryMuscles: ['side_delts', 'triceps', 'core'],
    equipment: 'bodyweight',
    metric: 'bodyweight_reps',
  },

  // --- VERTICAL PULL ---
  {
    name: 'Pull-Up',
    primaryMuscle: 'lats',
    secondaryMuscles: ['biceps', 'back', 'forearms', 'core'],
    equipment: 'bodyweight',
    metric: 'bodyweight_reps',
  },
  {
    name: 'Weighted Pull-Up',
    primaryMuscle: 'lats',
    secondaryMuscles: ['biceps', 'back', 'forearms', 'core'],
    equipment: 'bodyweight',
    metric: 'weighted_bodyweight',
  },
  {
    name: 'Chin-Up',
    primaryMuscle: 'lats',
    secondaryMuscles: ['biceps', 'back', 'forearms', 'core'],
    equipment: 'bodyweight',
    metric: 'bodyweight_reps',
  },
  {
    name: 'Lat Pulldown',
    primaryMuscle: 'lats',
    secondaryMuscles: ['biceps', 'back', 'rear_delts', 'forearms'],
    equipment: 'cable',
    metric: 'weight_reps',
  },
  {
    name: 'Straight-Arm Pulldown',
    primaryMuscle: 'lats',
    secondaryMuscles: ['triceps', 'core'],
    equipment: 'cable',
    metric: 'weight_reps',
  },

  // --- HORIZONTAL PULL ---
  {
    name: 'Barbell Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['lats', 'rear_delts', 'biceps', 'forearms'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'One-Arm Dumbbell Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['lats', 'rear_delts', 'biceps', 'forearms'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Seated Cable Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['lats', 'rear_delts', 'biceps', 'forearms'],
    equipment: 'cable',
    metric: 'weight_reps',
  },
  {
    name: 'Chest-Supported Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['lats', 'rear_delts', 'biceps'],
    equipment: 'machine',
    metric: 'weight_reps',
  },
  {
    name: 'Inverted Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['lats', 'rear_delts', 'biceps', 'core'],
    equipment: 'bodyweight',
    metric: 'bodyweight_reps',
  },

  // --- SHOULDER ISOLATION + TRAPS ---
  {
    name: 'Dumbbell Lateral Raise',
    primaryMuscle: 'side_delts',
    secondaryMuscles: ['front_delts', 'traps'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Cable Lateral Raise',
    primaryMuscle: 'side_delts',
    secondaryMuscles: ['front_delts'],
    equipment: 'cable',
    metric: 'weight_reps',
  },
  {
    name: 'Dumbbell Front Raise',
    primaryMuscle: 'front_delts',
    secondaryMuscles: ['side_delts'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Face Pull',
    primaryMuscle: 'rear_delts',
    secondaryMuscles: ['traps', 'back'],
    equipment: 'cable',
    metric: 'weight_reps',
  },
  {
    name: 'Reverse Pec Deck',
    primaryMuscle: 'rear_delts',
    secondaryMuscles: ['traps', 'back'],
    equipment: 'machine',
    metric: 'weight_reps',
  },
  {
    name: 'Bent-Over Dumbbell Reverse Fly',
    primaryMuscle: 'rear_delts',
    secondaryMuscles: ['traps', 'back'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Band Pull-Apart',
    primaryMuscle: 'rear_delts',
    secondaryMuscles: ['traps', 'back'],
    equipment: 'band',
    metric: 'weight_reps',
  },
  {
    name: 'Barbell Shrug',
    primaryMuscle: 'traps',
    secondaryMuscles: ['forearms'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },

  // --- BICEPS ---
  {
    name: 'Barbell Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Dumbbell Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Incline Dumbbell Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Hammer Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    name: 'Preacher Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Cable Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'cable',
    metric: 'weight_reps',
  },

  // --- TRICEPS ---
  {
    name: 'Close-Grip Bench Press',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'front_delts'],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Triceps Pushdown',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'cable',
    metric: 'weight_reps',
  },
  {
    name: 'Overhead Cable Triceps Extension',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'cable',
    metric: 'weight_reps',
  },
  {
    name: 'Skull Crusher',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  {
    name: 'Diamond Push-Up',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'front_delts'],
    equipment: 'bodyweight',
    metric: 'bodyweight_reps',
  },

  // --- FOREARMS / GRIP ---
  {
    name: 'Wrist Curl',
    primaryMuscle: 'forearms',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    metric: 'weight_reps',
  },
  {
    // A carry is held for a distance or a duration; there is no rep to count.
    name: "Farmer's Carry",
    primaryMuscle: 'forearms',
    secondaryMuscles: ['traps', 'core', 'glutes'],
    equipment: 'dumbbell',
    metric: 'time',
  },
  {
    name: 'Dead Hang',
    primaryMuscle: 'forearms',
    secondaryMuscles: ['lats'],
    equipment: 'bodyweight',
    metric: 'time',
  },

  // --- CALVES ---
  {
    name: 'Standing Calf Raise',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    equipment: 'machine',
    metric: 'weight_reps',
  },
  {
    name: 'Seated Calf Raise',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    equipment: 'machine',
    metric: 'weight_reps',
  },

  // --- CORE ---
  {
    name: 'Plank',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    equipment: 'bodyweight',
    metric: 'time',
  },
  {
    name: 'Side Plank',
    primaryMuscle: 'core',
    secondaryMuscles: ['abductors'],
    equipment: 'bodyweight',
    metric: 'time',
  },
  {
    name: 'Hanging Leg Raise',
    primaryMuscle: 'core',
    secondaryMuscles: ['forearms', 'lats'],
    equipment: 'bodyweight',
    metric: 'bodyweight_reps',
  },
  {
    name: 'Ab Wheel Rollout',
    primaryMuscle: 'core',
    secondaryMuscles: ['lats', 'front_delts'],
    equipment: 'bodyweight',
    metric: 'bodyweight_reps',
  },
  {
    name: 'Cable Crunch',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    equipment: 'cable',
    metric: 'weight_reps',
  },
  {
    name: 'Pallof Press',
    primaryMuscle: 'core',
    secondaryMuscles: ['front_delts'],
    equipment: 'cable',
    metric: 'weight_reps',
  },
  {
    name: 'Turkish Get-Up',
    primaryMuscle: 'core',
    secondaryMuscles: ['front_delts', 'side_delts', 'quads', 'glutes'],
    equipment: 'kettlebell',
    metric: 'weight_reps',
  },

  // --- HIPS ---
  {
    name: 'Hip Abduction Machine',
    primaryMuscle: 'abductors',
    secondaryMuscles: ['glutes'],
    equipment: 'machine',
    metric: 'weight_reps',
  },
  {
    name: 'Hip Adduction Machine',
    primaryMuscle: 'adductors',
    secondaryMuscles: [],
    equipment: 'machine',
    metric: 'weight_reps',
  },
];

/**
 * Fails before the first write rather than after a partial one. The type
 * annotations above already catch a typo at compile time, but this file is
 * outside `tsconfig.json#include` (which is `src/**`), so `check-types` never
 * sees it — and a run against production is the wrong place to discover that.
 *
 * A duplicate name inside the list matters for a different reason: with
 * `skipDuplicates` it would not throw, it would silently insert one of the two
 * and drop the other, leaving a row the author believes exists.
 */
function assertCatalogueIsValid(): void {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const exercise of EXERCISES) {
    if (seen.has(exercise.name)) {
      problems.push(`duplicate name: ${exercise.name}`);
    }
    seen.add(exercise.name);

    if (!MUSCLES.includes(exercise.primaryMuscle)) {
      problems.push(
        `${exercise.name}: unknown muscle "${exercise.primaryMuscle}"`
      );
    }
    for (const muscle of exercise.secondaryMuscles) {
      if (!MUSCLES.includes(muscle)) {
        problems.push(`${exercise.name}: unknown muscle "${muscle}"`);
      }
      if (muscle === exercise.primaryMuscle) {
        problems.push(
          `${exercise.name}: "${muscle}" is both primary and secondary`
        );
      }
    }
    if (!EQUIPMENT.includes(exercise.equipment)) {
      problems.push(
        `${exercise.name}: unknown equipment "${exercise.equipment}"`
      );
    }
    if (!METRICS.includes(exercise.metric)) {
      problems.push(`${exercise.name}: unknown metric "${exercise.metric}"`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Exercise catalogue is invalid:\n  ${problems.join('\n  ')}`
    );
  }
}

/**
 * Same resolution order as `seed-notes.ts`: an explicit id if one is given,
 * otherwise the first ADMIN.
 *
 * What is deliberately NOT copied is seed-notes' `user.upsert` fallback, which
 * CREATES a placeholder ADMIN when the requested id is missing. That exists to
 * paper over a JWT session outliving a local database — a dev-only problem.
 * Here it would mean inventing an admin account in production because someone
 * mistyped an id, so a missing id is an error instead.
 */
async function resolveOwner() {
  const requestedOwnerId = process.env.EXERCISES_OWNER_ID?.trim();

  if (requestedOwnerId) {
    const owner = await prisma.user.findUnique({
      where: { id: requestedOwnerId },
      select: { id: true, email: true },
    });

    if (!owner) {
      throw new Error(
        `EXERCISES_OWNER_ID="${requestedOwnerId}" matches no user. ` +
          'Nothing was seeded — orphaned exercises would be invisible to every query.'
      );
    }

    return owner;
  }

  const owner = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true, email: true },
  });

  if (!owner) {
    throw new Error(
      'No ADMIN user found and no EXERCISES_OWNER_ID given. Nothing was seeded.\n' +
        'Every exercise is scoped by ownerId, so a row without a real owner is dead data.\n' +
        'Run the main seed first (bun run db:seed) or pass EXERCISES_OWNER_ID=<id>.'
    );
  }

  return owner;
}

async function main() {
  assertCatalogueIsValid();

  const owner = await resolveOwner();

  console.log(
    `Seeding ${EXERCISES.length} exercises for ${owner.email ?? owner.id}...`
  );

  /**
   * Read first, then insert only what is missing.
   *
   * `upsert` would work for the unique constraint but issues an UPDATE on
   * every existing row, which bumps `updated_at` and — the moment anyone adds
   * a field to the update clause — starts overwriting the owner's edits and
   * un-archiving what they archived. INSERT-only makes that impossible rather
   * than merely unlikely, and it is one round trip for the whole batch.
   *
   * `skipDuplicates` stays on regardless: it covers a row created between this
   * read and the write, so a concurrent run cannot turn into a crash.
   */
  const existing = await prisma.exercise.findMany({
    where: { ownerId: owner.id },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((row) => row.name));

  const missing = EXERCISES.filter(
    (exercise) => !existingNames.has(exercise.name)
  );

  if (missing.length === 0) {
    console.log(
      `  all ${EXERCISES.length} already present — nothing to do (${existing.length} exercise(s) on this owner).`
    );
    return;
  }

  const created = await prisma.exercise.createMany({
    data: missing.map((exercise) => ({
      ownerId: owner.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      secondaryMuscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      metric: exercise.metric,
    })),
    skipDuplicates: true,
  });

  const skipped = EXERCISES.length - missing.length;

  console.log(`  created ${created.count}`);
  if (skipped > 0) {
    console.log(`  left untouched (already exist): ${skipped}`);
  }
  console.log(
    'Existing rows were not modified: no update, no delete, isArchived preserved.'
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
