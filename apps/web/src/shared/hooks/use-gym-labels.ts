'use client';

import {
  EQUIPMENT,
  type Equipment,
  type Metric,
  METRICS,
  type Muscle,
  MUSCLES,
} from '@byte-of-me/db/gym-vocabulary';
import { useTranslations } from 'next-intl';

/**
 * The gym vocabulary, in the reader's language.
 *
 * The CODES (`front_delts`, `weighted_bodyweight`) come from
 * `@byte-of-me/db/gym-vocabulary` and have exactly one definition — the seed,
 * the Zod schemas and this hook all read that const, because the three lists
 * existed as hand-synchronised copies for one commit and had already drifted
 * on five codes by the end of it (`b9ca342`). The LABELS are UI text and live
 * in `dashboard.health.{muscles,equipment,metrics}` in both catalogues, since
 * a translator can read "Front delts" without the running app (AGENTS §4).
 *
 * It lives in `shared/hooks/` rather than in one of the gym features because
 * four of them render these words — the catalogue, the picker, the routine
 * editor and the session editor — and a feature importing another feature's
 * internals is the sideways import AGENTS §3 rules out. `shared` sits below
 * all of them, so nobody has to reach across.
 *
 * Every key is written out as a LITERAL. next-intl generates its declarations
 * from the catalogue and only type-checks literal keys, so a computed
 * `t(`muscles.${code}`)` type-checks against nothing and ships a key that may
 * not exist — the same reason `SleepFactorGrid` spells its six labels out. The
 * `Record<Muscle, string>` return type is what makes a missing entry a
 * compile error the moment the vocabulary grows.
 */
export function useGymLabels(): {
  muscle: Record<Muscle, string>;
  equipment: Record<Equipment, string>;
  metric: Record<Metric, string>;
  /** The vocabularies themselves, so a caller can map over them in the one
   *  order every screen shows them in without importing the const twice. */
  muscles: typeof MUSCLES;
  equipments: typeof EQUIPMENT;
  metrics: typeof METRICS;
} {
  const tMuscle = useTranslations('dashboard.health.muscles');
  const tEquipment = useTranslations('dashboard.health.equipment');
  const tMetric = useTranslations('dashboard.health.metrics');

  return {
    muscle: {
      chest: tMuscle('chest'),
      back: tMuscle('back'),
      lats: tMuscle('lats'),
      traps: tMuscle('traps'),
      front_delts: tMuscle('front_delts'),
      side_delts: tMuscle('side_delts'),
      rear_delts: tMuscle('rear_delts'),
      biceps: tMuscle('biceps'),
      triceps: tMuscle('triceps'),
      forearms: tMuscle('forearms'),
      quads: tMuscle('quads'),
      hamstrings: tMuscle('hamstrings'),
      glutes: tMuscle('glutes'),
      calves: tMuscle('calves'),
      core: tMuscle('core'),
      adductors: tMuscle('adductors'),
      abductors: tMuscle('abductors'),
    },
    equipment: {
      barbell: tEquipment('barbell'),
      dumbbell: tEquipment('dumbbell'),
      machine: tEquipment('machine'),
      cable: tEquipment('cable'),
      bodyweight: tEquipment('bodyweight'),
      kettlebell: tEquipment('kettlebell'),
      band: tEquipment('band'),
    },
    metric: {
      weight_reps: tMetric('weight_reps'),
      bodyweight_reps: tMetric('bodyweight_reps'),
      weighted_bodyweight: tMetric('weighted_bodyweight'),
      time: tMetric('time'),
    },
    muscles: MUSCLES,
    equipments: EQUIPMENT,
    metrics: METRICS,
  };
}

/**
 * A code that came back from the database, as a label.
 *
 * `ExerciseRow.primaryMuscle` is typed `string`, not `Muscle` — the action
 * hands back what the column holds, and the column is a `text`. A row written
 * before a vocabulary entry was renamed would otherwise render as `undefined`,
 * which is worse than rendering the raw code: the code is at least searchable.
 */
export function labelForCode(
  labels: Record<string, string>,
  code: string
): string {
  return labels[code] ?? code;
}
