import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface DisclosureRegionProps {
  id: string;
  open: boolean;
  /** False until the first user toggle, so a state set on mount does not animate. */
  animated: boolean;
  /** Placement in the parent grid, e.g. `col-start-2`. */
  className?: string;
  children: ReactNode;
}

/**
 * Height reveal with no measurement: the track goes 0fr -> 1fr. Content stays in
 * the DOM (SEO, print, find-in-page); `inert` takes it out of the tab order and
 * the accessibility tree while closed. Open eases out over 250ms, close eases
 * in over 200ms (.claude/rules/motion.md).
 */
export function DisclosureRegion({
  id,
  open,
  animated,
  className,
  children,
}: DisclosureRegionProps) {
  return (
    <div
      id={id}
      inert={!open}
      className={cn(
        'grid print:grid-rows-[1fr] print:opacity-100',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        // Reduced motion sets only the property: a `transition-[...]` utility would
        // also reset the duration and easing that the classes below set.
        animated &&
          'transition-[grid-template-rows,opacity] motion-reduce:[transition-property:opacity]',
        animated && (open ? 'duration-250 ease-enter' : 'duration-200 ease-exit'),
        className
      )}
    >
      {/* `overflow-clip`, not hidden: a clip box is not a scroll container. The
          negative margin and padding keep room for a focus ring on an edge link. */}
      <div className="-mx-1 min-h-0 overflow-clip px-1">{children}</div>
    </div>
  );
}
