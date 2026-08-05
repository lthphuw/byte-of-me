import type { NotePropertyValue } from '@/entities/note';

/**
 * What typing in the value field means: `"true"`/`"false"` become booleans,
 * a numeric string becomes a number, anything else stays text. Inference on
 * commit, not per keystroke — "42a" mid-typing must not flap between types.
 */
export function coercePropertyValue(raw: string): NotePropertyValue {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
    return Number(trimmed);
  }
  return trimmed;
}
