'use client';

import { type ReactNode, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { DisclosureRegion } from '@/shared/ui/disclosure-region';

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
 * The folded rows hold carousels and expandable text whose heights are only known
 * after layout, so the height reveal is `DisclosureRegion`, which needs no
 * measurement. The rows stay in the DOM, still laid out, so the carousels size
 * correctly while collapsed.
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
      {/* This fold never opens on load, so its transitions are always armed. */}
      <DisclosureRegion id={regionId} open={open} animated>
        {children}
      </DisclosureRegion>

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
