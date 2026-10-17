import { cn } from '@/shared/lib/utils';

/**
 * The sliding highlight behind a two-option switch. Two equal columns, so it moves one column by
 * CSS transform: no measuring and no `layout` (the lazy feature set lacks it). Render it first in
 * a `relative isolate` list whose options draw no active background of their own.
 */
export function SegmentPill({
  end,
  className,
}: {
  /** True when the second option is active. */
  end: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-1 left-1 -z-10 w-[calc(50%-0.25rem)] rounded-md bg-background shadow motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-sleek',
        end ? 'translate-x-full' : 'translate-x-0',
        className
      )}
    />
  );
}
