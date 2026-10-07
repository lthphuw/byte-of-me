'use client';

import { type ReactNode, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

interface AchievementFoldProps {
  /** The folded achievements, rendered by the server parent. */
  children: ReactNode;
  /** "2 more achievements": copy comes in, an entity must not pick a namespace. */
  showMoreLabel: string;
  showLessLabel: string;
}

/**
 * The achievements past the first few. They open downward in place and the
 * toggle stays at the very end of the list, so "show less" is always the last
 * thing under what it collapses.
 *
 * The height animates through a `grid-template-rows` 0fr -> 1fr transition,
 * which needs no measurement (the rows hold carousels and expandable text whose
 * heights are only known after layout). The folded rows stay in the DOM, still
 * laid out, so their carousels size correctly; `inert` takes them out of the tab
 * order and the accessibility tree while they are collapsed.
 */
export function AchievementFold({
  children,
  showMoreLabel,
  showLessLabel,
}: AchievementFoldProps) {
  const [open, setOpen] = useState(false);
  const regionId = useId();

  return (
    <div>
      <div
        id={regionId}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows,opacity] motion-reduce:transition-none',
          // A transition takes its timing from the state it ends in, so each
          // branch carries its own: open eases out, close is shorter and eases in.
          open
            ? 'grid-rows-[1fr] opacity-100 duration-250 ease-enter'
            : 'grid-rows-[0fr] opacity-0 duration-200 ease-exit'
        )}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 border-t px-4 py-3 text-left text-sm text-primary transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5"
      >
        <span>{open ? showLessLabel : showMoreLabel}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            'h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none',
            open
              ? 'rotate-180 duration-250 ease-enter'
              : 'duration-200 ease-exit'
          )}
        />
      </button>
    </div>
  );
}
