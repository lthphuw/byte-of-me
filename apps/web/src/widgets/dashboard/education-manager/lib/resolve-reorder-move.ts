/**
 * Translates a reordered list of ids back into a single `from -> to` move.
 *
 * framer-motion's `Reorder` hands back the whole new order, while
 * react-hook-form's `useFieldArray` wants `move(from, to)`. Comparing the two
 * orders and picking the id that travelled furthest recovers that move — a
 * drag only ever relocates one item, so the largest displacement is always the
 * dragged one.
 */
export function resolveReorderMove(
  currentIds: string[],
  nextIds: string[]
): { from: number; to: number } | null {
  if (currentIds.length !== nextIds.length) return null;

  let from = -1;
  let to = -1;
  let largestShift = 0;

  nextIds.forEach((id, nextIndex) => {
    const currentIndex = currentIds.indexOf(id);
    if (currentIndex === -1) return;

    const shift = Math.abs(nextIndex - currentIndex);
    if (shift > largestShift) {
      largestShift = shift;
      from = currentIndex;
      to = nextIndex;
    }
  });

  return largestShift === 0 ? null : { from, to };
}
