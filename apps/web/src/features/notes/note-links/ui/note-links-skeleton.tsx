'use client';

import { Skeleton } from '@byte-of-me/ui';

import { noteLinkIndent } from './note-link-row-shell';

import { cn } from '@/shared/lib/utils';

/**
 * Title-bar widths, cycled by row index. Identical bars read as a striped
 * block; the titles in a real neighbourhood are all different lengths, so the
 * placeholder has to be too or it stops looking like a list of documents. Same
 * reasoning `NoteRowSkeleton` records for the tree.
 */
const TITLE_WIDTHS = ['w-[58%]', 'w-[76%]', 'w-[44%]'];

interface NoteLinkRowSkeletonProps {
  /**
   * Depth in the outgoing tree, applied through the SAME helper
   * `NoteLinkBranch` uses on its rows — a nested placeholder that ignores it
   * lands in the root column and reads as a sibling of the branch it belongs
   * under.
   */
  depth?: number;
  /** Position in a stack. Only picks which title width this row draws. */
  index?: number;
  /**
   * Reserve the expand button's column. Outgoing rows carry one; a backlink is
   * a plain button and does not, so a placeholder that always drew the column
   * would put every backlink title a whole column right of where it lands.
   */
  hasChevron?: boolean;
}

/**
 * One row of the links panel, in placeholder form.
 *
 * The reserved chevron column is `size-9`, NOT the `size-6` `NoteLinkBranch`
 * passes its button, and that is measured rather than chosen. This repo pins
 * tailwind-merge 1.x, which predates the `size-*` group, so the utility never
 * displaces the shadcn `Button size="icon"` variant's own `h-9 w-9` and the
 * column renders 36px wide. `note-row-shell.ts` records the identical
 * discovery for the tree, where a placeholder that trusted the class it was
 * given rather than the box that actually paints ended up 8px short with its
 * icon in the wrong column.
 */
export function NoteLinkRowSkeleton({
  depth = 0,
  index = 0,
  hasChevron = true,
}: NoteLinkRowSkeletonProps) {
  return (
    <div
      aria-hidden
      className="flex min-h-8 items-center gap-1 rounded-md"
      style={noteLinkIndent(depth)}
    >
      {/* Left empty rather than filled with a bar. A row with nothing to
          expand renders its chevron `invisible` in the loaded panel, so a bar
          here would promise an affordance the real branch then takes away. */}
      {hasChevron && <div className="size-9 shrink-0" />}

      <div className="flex min-w-0 flex-1 items-center gap-2 py-1">
        {/* The `CornerDownRight` / `CornerUpLeft` glyph. */}
        <Skeleton className="size-3.5 shrink-0" />

        {/* `h-5` is the line box `text-sm` gives the real title; the bar
            inside is thinner than its line, the way a glyph is. Without the
            line box the row collapses below the 32px `min-h-8` the loaded row
            keeps. */}
        <span className="flex h-5 min-w-0 flex-1 items-center">
          <Skeleton
            className={cn('h-3.5', TITLE_WIDTHS[index % TITLE_WIDTHS.length])}
          />
        </span>
      </div>
    </div>
  );
}

/** A section heading bar, at the real `<h2>`'s padding. */
function SectionHeadingSkeleton() {
  return (
    <div aria-hidden className="px-1 pb-1">
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

/**
 * `NoteLinksPanel`, loading. Mirrors that component's two bands — "Links out"
 * as an indentable tree, "Mentioned by" as a flat list — with the same
 * headings and the same `mt-4` between them, so the real neighbourhood
 * swapping in lands where the placeholder stood.
 *
 * Both bands are drawn even though plenty of notes have only one. The panel is
 * top-anchored in its own scroller, so neither over- nor under-drawing moves
 * anything already on screen; what the second band buys is that the
 * placeholder reads as THIS panel's structure rather than as a generic list of
 * bars. The previous placeholder — a `h-4` bar over two `h-6` bars — described
 * nothing that ever appears here.
 */
export function NoteLinksSkeleton() {
  return (
    <div>
      <section>
        <SectionHeadingSkeleton />
        <NoteLinkRowSkeleton index={0} />
        <NoteLinkRowSkeleton index={1} />
        <NoteLinkRowSkeleton index={2} />
      </section>

      <section className="mt-4">
        <SectionHeadingSkeleton />
        <NoteLinkRowSkeleton index={1} hasChevron={false} />
        <NoteLinkRowSkeleton index={2} hasChevron={false} />
      </section>
    </div>
  );
}
