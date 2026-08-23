import type { WorkoutSetRow } from '@/entities/workout';
import {
  integerFieldToValue,
  numberFieldToValue,
  valueToNumberField,
} from '@/shared/lib/number-field';

/**
 * One set while it is being entered or corrected.
 *
 * Every measure is a STRING, because every one of them is nullable and an
 * empty `<input>` reads as `''`. Zero and "not recorded" are different claims
 * here in a way that reaches the numbers: a set with no RPE must not enter a
 * training load as a zero (`shared/lib/number-field.ts`).
 *
 * `completedAt` rides along UNCHANGED and is never edited. It is the field
 * that makes real rest intervals recoverable after the fact, and
 * `workoutSetUpdateSchema` defaults it to null — so a correction that did not
 * carry the stored value forward would silently erase it. This screen is the
 * post-workout entry path and has no business inventing one either: stamping
 * "now" on a set performed two hours ago is a worse record than none.
 */
export interface SetDraft {
  /** Null while adding, the row's id while editing. */
  id: string | null;
  reps: string;
  weightKg: string;
  rpe: string;
  durationSec: string;
  isWarmup: boolean;
  completedAt: string | null;
}

export function toSetDraft(set: WorkoutSetRow): SetDraft {
  return {
    id: set.id,
    reps: valueToNumberField(set.reps),
    weightKg: valueToNumberField(set.weightKg),
    rpe: valueToNumberField(set.rpe),
    durationSec: valueToNumberField(set.durationSec),
    isWarmup: set.isWarmup,
    completedAt: set.completedAt,
  };
}

/**
 * A blank set, seeded from the last one logged for this exercise.
 *
 * Repeating the previous set is what actually happens in a gym — five sets of
 * the same weight and reps is the common case, not the exception — so the
 * fastest correct default is the set before it, minus its warm-up flag.
 * `isWarmup` is deliberately NOT carried: warm-ups come first and working sets
 * follow, so inheriting it would mark every set of the session as a warm-up
 * and quietly take the whole exercise out of volume.
 */
export function nextSetDraft(previous: WorkoutSetRow | undefined): SetDraft {
  if (!previous) {
    return {
      id: null,
      reps: '',
      weightKg: '',
      rpe: '',
      durationSec: '',
      isWarmup: false,
      completedAt: null,
    };
  }

  return {
    id: null,
    reps: valueToNumberField(previous.reps),
    weightKg: valueToNumberField(previous.weightKg),
    rpe: valueToNumberField(previous.rpe),
    durationSec: valueToNumberField(previous.durationSec),
    isWarmup: false,
    completedAt: null,
  };
}

/** The measures, as the add/update schemas take them. `position` is absent on
 *  purpose: the server appends, so two sets entered in quick succession cannot
 *  collide on a position nothing constrains. */
export function draftToSetPayload(draft: SetDraft) {
  return {
    reps: integerFieldToValue(draft.reps),
    weightKg: roundWeight(numberFieldToValue(draft.weightKg)),
    rpe: roundHalf(numberFieldToValue(draft.rpe)),
    durationSec: integerFieldToValue(draft.durationSec),
    isWarmup: draft.isWarmup,
    completedAt: draft.completedAt,
  };
}

/**
 * Kilograms to two decimal places — the precision of `Decimal(6,2)`.
 *
 * The schema refuses anything finer rather than letting Postgres round
 * silently, because a silently rounded plate weight is how a volume total
 * starts disagreeing with the numbers that were typed. Rounding here means a
 * stray third decimal from a number input is corrected instead of rejected.
 */
function roundWeight(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100) / 100;
}

/** RPE to the nearest half point, the granularity the scale is used at and the
 *  one `multipleOf(0.5)` enforces. 0.5 is exactly representable in binary
 *  floating point, so this rounding is exact. */
function roundHalf(value: number | null): number | null {
  return value === null ? null : Math.round(value * 2) / 2;
}
