import type { RoutineItemRow, RoutineRow } from '@/entities/exercise';
import {
  integerFieldToValue,
  numberFieldToValue,
  valueToNumberField,
} from '@/shared/lib/number-field';

/**
 * No `'use client'` in this file, deliberately — the same split
 * `exercise-filters.ts` documents. `DEFAULT_ROUTINE_INCLUDE_ARCHIVED` is read
 * by a server prefetch and by the `useQuery` that hydrates from it, and a
 * constant imported out of a client module reaches the server as a
 * client-reference proxy: the key hashes differently on the two sides, nothing
 * raises, and the list sits on skeletons.
 */
export const DEFAULT_ROUTINE_INCLUDE_ARCHIVED = false;

/**
 * One routine item while it is being edited.
 *
 * Every target is a STRING, because each is optional and an empty
 * `<input type="number">` reads as `''` — a draft that held numbers would have
 * to invent a value for "not answered", and zero is a different claim from
 * silence (`shared/lib/number-field.ts`).
 *
 * `key` exists only for React's list identity and never crosses the boundary.
 * A newly added item has no server id at all — `routineUpdateSchema` REPLACES
 * the item list rather than diffing it, precisely because the editor cannot
 * produce ids for rows it just created — so the index is not usable as a key
 * either: reordering two items would make React reuse the wrong input state.
 *
 * `exerciseName` rides along so the editor draws a list without a second read.
 * It is display-only; `exerciseId` is the field the server stores.
 */
export interface RoutineItemDraft {
  key: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  targetSets: string;
  targetRepsLow: string;
  targetRepsHigh: string;
  targetRpe: string;
  restSec: string;
}

export interface RoutineDraft {
  /** Null for a routine being created. */
  id: string | null;
  name: string;
  notes: string;
  items: RoutineItemDraft[];
}

/** A stored routine as the form's starting state. */
export function toRoutineDraft(routine: RoutineRow): RoutineDraft {
  return {
    id: routine.id,
    name: routine.name,
    notes: routine.notes ?? '',
    items: routine.items.map(toItemDraft),
  };
}

function toItemDraft(item: RoutineItemRow): RoutineItemDraft {
  return {
    key: item.id,
    exerciseId: item.exerciseId,
    exerciseName: item.exerciseName,
    primaryMuscle: item.primaryMuscle,
    targetSets: valueToNumberField(item.targetSets),
    targetRepsLow: valueToNumberField(item.targetRepsLow),
    targetRepsHigh: valueToNumberField(item.targetRepsHigh),
    targetRpe: valueToNumberField(item.targetRpe),
    restSec: valueToNumberField(item.restSec),
  };
}

/** The empty form. */
export function emptyRoutineDraft(): RoutineDraft {
  return { id: null, name: '', notes: '', items: [] };
}

/**
 * A draft as the payload the create/update actions validate.
 *
 * `position` is absent on purpose: the array's order IS the order, and the
 * server assigns positions from the index. `RoutineExercise` has no unique
 * constraint on `(routineId, position)`, so a client-supplied position that
 * collides would render the plan in whatever order Postgres felt like.
 */
export function draftToPayload(draft: RoutineDraft) {
  return {
    name: draft.name.trim(),
    notes: draft.notes.trim() === '' ? null : draft.notes.trim(),
    items: draft.items.map((item) => ({
      exerciseId: item.exerciseId,
      targetSets: integerFieldToValue(item.targetSets),
      targetRepsLow: integerFieldToValue(item.targetRepsLow),
      targetRepsHigh: integerFieldToValue(item.targetRepsHigh),
      targetRpe: numberFieldToValue(item.targetRpe),
      restSec: integerFieldToValue(item.restSec),
    })),
  };
}

/**
 * Whether any item's rep range runs backwards.
 *
 * `routineItems` refuses the whole save on this, with a message naming two
 * schema field names. Catching it here lets the form say it in the reader's
 * language, next to the two inputs that disagree, before the round trip.
 */
export function hasInvertedRepRange(draft: RoutineDraft): boolean {
  return draft.items.some((item) => {
    const low = integerFieldToValue(item.targetRepsLow);
    const high = integerFieldToValue(item.targetRepsHigh);

    return low !== null && high !== null && low > high;
  });
}

/** Move one item by one place, returning a new array. Out-of-range moves are
 *  no-ops rather than errors — the first item's "up" button is disabled, and
 *  this is the second half of that guarantee. */
export function moveItem(
  items: RoutineItemDraft[],
  index: number,
  delta: number
): RoutineItemDraft[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;

  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);

  return next;
}
