import { EQUIPMENT, type Equipment } from '@byte-of-me/db/gym-vocabulary';

import { numberFieldToValue } from '@/shared/lib/number-field';

/**
 * How much one press of `+` moves a number, per equipment and per measure.
 *
 * The live logger has no OS keyboard — a phone keypad covers half the screen
 * and pushes the sticky bar out from under the thumb that was about to press
 * it — so every number is entered by stepping. That makes the step size the
 * whole ergonomics of the screen: too coarse and a real weight is
 * unreachable, too fine and a plate change costs four taps.
 *
 * **Where it is uncertain, the step errs SMALL**, and that asymmetry is
 * deliberate. Guessing under the real plate increment costs an extra tap;
 * guessing over it makes a legitimate weight impossible to reach with the
 * steppers at all, and sends the reader to the numpad for a number the control
 * was built to produce. Machine stacks are the case that decides it: most are
 * pinned at 5 kg but plenty are 2.5, and 2.5 reaches both.
 */
const DEFAULT_WEIGHT_STEP_KG = 2.5;

/**
 * Fixed dumbbells and kettlebells come in whole-kilo racks, usually stepping
 * by 2 (dumbbells) or 4 (kettlebells). 2 kg is the step for both: it lands on
 * every dumbbell in a rack and on every second kettlebell, which is the same
 * error-small rule as above.
 */
const WEIGHT_STEP_KG: Record<Equipment, number> = {
  barbell: DEFAULT_WEIGHT_STEP_KG,
  dumbbell: 2,
  machine: DEFAULT_WEIGHT_STEP_KG,
  cable: DEFAULT_WEIGHT_STEP_KG,
  // Added load on a dip belt or a weight vest, in 1.25 kg discs more often
  // than not — this is the `weighted_bodyweight` case, where the number means
  // "added", not "total".
  bodyweight: 1.25,
  kettlebell: 2,
  band: DEFAULT_WEIGHT_STEP_KG,
};

const isEquipment = (value: string): value is Equipment =>
  (EQUIPMENT as readonly string[]).includes(value);

/**
 * The weight step for an exercise's equipment.
 *
 * `WorkoutExerciseRow.equipment` is typed `string`, not `Equipment` — the
 * action hands back what the column holds, and the column is a `text`. A code
 * the vocabulary has since dropped falls back to the default rather than
 * indexing the map to `undefined` and stepping a weight by `NaN`, which is
 * how a stepper starts printing "NaN kg" and the set that follows is logged
 * with no load at all.
 */
export function weightStepKg(equipment: string): number {
  return isEquipment(equipment)
    ? WEIGHT_STEP_KG[equipment]
    : DEFAULT_WEIGHT_STEP_KG;
}

/** Reps are counted, so the step is one. */
export const REPS_STEP = 1;

/** Five seconds for a held position. A plank is logged to the nearest five
 *  seconds by anyone not holding a stopwatch, and the long-press repeat covers
 *  the distance from 0 to 60 in under a second. */
export const DURATION_STEP_SEC = 5;

/** Half a point, the granularity `workoutSetAddSchema` accepts and the one the
 *  scale is actually used at. */
export const RPE_STEP = 0.5;

/**
 * Rest interval, in seconds, when the routine does not name one.
 *
 * Two minutes is the middle of the range compound work is normally rested at
 * and long enough that the timer is worth starting; a shorter default would
 * expire during the walk back to the bench and train the reader to ignore it.
 */
export const DEFAULT_REST_SEC = 120;

/**
 * One press of a stepper, applied to the string a measure is held as.
 *
 * The measures stay STRINGS all the way to `draftToSetPayload` because every
 * one of them is nullable and "not recorded" is a different claim from zero
 * (`shared/lib/number-field.ts`). Stepping therefore has to round-trip through
 * that representation rather than through a number, or the first `+` on an
 * empty field would turn "no RPE" into "RPE 0.5" and quietly enter a training
 * load that was never recorded.
 *
 * An empty field steps from `min` — one press of `+` on a blank rep counter
 * reads 1, one press of `−` reads 0 — rather than staying empty. A stepper
 * that does nothing on the first press looks broken, and this is only ever the
 * first set of an exercise with no history behind it; every later set arrives
 * seeded from the one before.
 *
 * Rounded to two decimals — the precision of the `Decimal(6,2)` weight column,
 * and enough to absorb any drift a chain of additions could introduce. Every
 * step in `WEIGHT_STEP_KG` is exactly representable in binary floating point
 * (2.5, 2, 1.25), so today this rounding never changes a value; it is here so
 * that adding a 0.1 step later cannot silently produce 7.400000000000001 and
 * have the schema reject the set.
 */
export function stepValue(
  current: string,
  delta: number,
  bounds: { min: number; max: number }
): string {
  const base = numberFieldToValue(current) ?? bounds.min;
  const clamped = Math.min(bounds.max, Math.max(bounds.min, base + delta));

  return String(Math.round(clamped * 100) / 100);
}
