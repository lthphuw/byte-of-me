'use client';

import { Skeleton } from '@byte-of-me/ui';

import { cn } from '@/shared/lib/utils';

/**
 * Title / snippet bar widths, cycled by row index. Identical pairs read as a
 * striped block rather than as search results, which are ragged by nature —
 * the same reasoning `NoteRowSkeleton` records for the tree.
 */
const ROW_WIDTHS = [
  ['w-[46%]', 'w-[82%]'],
  ['w-[62%]', 'w-[68%]'],
  ['w-[38%]', 'w-[90%]'],
  ['w-[55%]', 'w-[74%]'],
  ['w-[44%]', 'w-[60%]'],
];

/**
 * The results list, loading.
 *
 * It replaces a single centred line of copy — "Searching…" in a `py-6` box —
 * which described neither where the results would appear nor how many, and
 * moved every row down the moment they did. The rows below reproduce
 * `CommandItem`'s box (`px-2 py-1.5`) and both of a hit's line boxes, so the
 * list swaps rather than jumps.
 *
 * Note this is NOT a `CommandItem`: cmdk registers every item in its store and
 * makes it selectable, so placeholder rows would join the keyboard rotation
 * and Enter could "open" one. Plain divs at the same geometry stay inert.
 */
export function NoteSearchSkeleton({ label }: { label: string }) {
  return (
    // `aria-busy` + a name on the container, matching `NoteEditorSkeleton` and
    // `SpaceHubSkeleton`; the bars themselves are decorative. The name is
    // passed in rather than translated here so this file stays free of a
    // namespace, and so the palette keeps using the `search.loading` string it
    // already owned in both catalogues.
    <div className="p-1" aria-busy="true" aria-label={label}>
      {ROW_WIDTHS.map(([titleWidth, snippetWidth]) => (
        <div
          key={titleWidth}
          aria-hidden
          className="flex min-w-0 flex-col rounded-sm px-2 py-1.5"
        >
          {/* `h-5` and `h-4` are the line boxes `text-sm` and `text-xs` give
              the real title and snippet; the bars inside are thinner than
              their lines, the way glyphs are. Reproducing the boxes rather
              than guessing a height is what keeps a placeholder row exactly as
              tall as the hit that replaces it. */}
          <span className="flex h-5 items-center">
            <Skeleton className={cn('h-3.5', titleWidth)} />
          </span>
          <span className="flex h-4 items-center">
            <Skeleton className={cn('h-2.5', snippetWidth)} />
          </span>
        </div>
      ))}
    </div>
  );
}
