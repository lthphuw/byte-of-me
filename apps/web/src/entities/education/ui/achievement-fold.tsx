'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

interface FoldState {
  open: boolean;
  toggle: () => void;
}

const FoldContext = createContext<FoldState | null>(null);

/**
 * Wraps the achievement tree. The folded rows are server markup that stay in the tree as
 * siblings of the shown ones, so the trunk and the hover path run through them; they read the
 * fold as `data-fold` through `group/fold` (`TreeItem` `fold`). Rows stay in the DOM while shut,
 * so carousels and expandable text size while collapsed.
 */
export function AchievementFold({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const state = useMemo(
    () => ({ open, toggle: () => setOpen((value) => !value) }),
    [open]
  );

  return (
    <FoldContext.Provider value={state}>
      <div data-fold={open ? 'open' : 'closed'} className="group/fold">
        {children}
      </div>
    </FoldContext.Provider>
  );
}

/** The last row of the tree: "2 more achievements" / "Show less". Copy comes in from the feature. */
export function AchievementFoldToggle({
  showMoreLabel,
  showLessLabel,
}: {
  showMoreLabel: string;
  showLessLabel: string;
}) {
  const state = useContext(FoldContext);
  if (!state) {
    throw new Error('AchievementFoldToggle must sit inside an AchievementFold');
  }
  const { open, toggle } = state;

  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={toggle}
      className="relative inline-flex items-center gap-1.5 rounded-sm text-[13px] leading-5 text-primary underline underline-offset-4 before:absolute before:-inset-y-3.5 before:inset-x-0 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span>{open ? showLessLabel : showMoreLabel}</span>
      <ChevronDown
        aria-hidden
        className={cn(
          'size-3.5 shrink-0 transition-transform motion-reduce:transition-none',
          open
            ? 'rotate-180 duration-250 ease-enter'
            : 'duration-200 ease-exit'
        )}
      />
    </button>
  );
}
