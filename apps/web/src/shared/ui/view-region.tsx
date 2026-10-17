import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

// A part of a row that exists in one view only. `ViewSwitchRoot` puts `data-view` and `group/view`
// on the section, so these stay server markup. Open is 250ms ease-out, close 200ms ease-in;
// `invisible` takes a closed part out of tab order and flips at the end of a close.
const TRANSITION =
  'motion-reduce:[transition-property:opacity,visibility] transition-[grid-template-rows,grid-template-columns,opacity,visibility]';

const ROWS = {
  details:
    'grid grid-rows-[0fr] opacity-0 invisible duration-200 ease-exit group-data-[view=details]/view:grid-rows-[1fr] group-data-[view=details]/view:opacity-100 group-data-[view=details]/view:visible group-data-[view=details]/view:duration-250 group-data-[view=details]/view:ease-enter',
  compact:
    'grid grid-rows-[1fr] opacity-100 duration-250 ease-enter group-data-[view=details]/view:grid-rows-[0fr] group-data-[view=details]/view:opacity-0 group-data-[view=details]/view:invisible group-data-[view=details]/view:duration-200 group-data-[view=details]/view:ease-exit',
};

// 50ms between the repos, on the open only; a close leaves all of them at once. An arbitrary
// property, because `delay-[50ms]` emitted no rule here (computed delay stayed 0s).
const STAGGER = [
  '',
  'group-data-[view=details]/view:[transition-delay:50ms]',
  'group-data-[view=details]/view:[transition-delay:100ms]',
];

/** Height `0fr -> 1fr` with no measuring: the `DisclosureRegion` technique, keyed on the view. */
export function ViewRegion({
  show,
  index = 0,
  className,
  children,
}: {
  show: 'compact' | 'details';
  /** Position in the list: staggers the open of a `details` region. */
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        TRANSITION,
        ROWS[show],
        show === 'details' && STAGGER[Math.min(index, STAGGER.length - 1)],
        className
      )}
    >
      {/* `min-w-0`: `overflow-clip` is not a scroll container, so without it the grid item keeps
          its content width and a long PR title pushes the row past the card (376px in 311px). */}
      <div className="min-h-0 min-w-0 overflow-clip">{children}</div>
    </div>
  );
}

/** The same collapse along the line, for what shares a line with the parts that stay. */
export function ViewInline({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        TRANSITION,
        'inline-grid grid-cols-[1fr] opacity-100 duration-250 ease-enter group-data-[view=details]/view:grid-cols-[0fr] group-data-[view=details]/view:opacity-0 group-data-[view=details]/view:invisible group-data-[view=details]/view:duration-200 group-data-[view=details]/view:ease-exit'
      )}
    >
      <div className="flex min-w-0 items-center overflow-clip whitespace-nowrap">
        {children}
      </div>
    </div>
  );
}
