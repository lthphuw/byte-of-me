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
 * Achievements past the first few, opening downward with the toggle at the list end. Carousels and
 * expandable text have heights known only after layout, so the reveal is `DisclosureRegion` (no
 * measuring); rows stay in the DOM so carousels size while collapsed.
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
