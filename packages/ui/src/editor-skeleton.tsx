import { cn } from '@byte-of-me/ui-utils';

import { Skeleton } from './skeleton';

/**
 * The editor's frame while it loads: the same box, a bar's worth of toolbar and
 * the body, at the size the editor will take, so nothing moves when it arrives.
 * Kept out of `rich-text-editor` so the loader can import it without the editor.
 */
export function EditorSkeleton({
  compact = false,
  minHeight,
  className,
}: {
  compact?: boolean;
  /** Body height floor in px; compact only, as on the editor (default 160). */
  minHeight?: number;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      className={cn(
        'flex w-full flex-col overflow-clip rounded-md border border-input bg-card',
        className
      )}
    >
      {/* The compact editor hides its toolbar below `sm`. */}
      <div
        className={cn(
          'items-center gap-2 border-b px-2 py-1.5',
          compact ? 'hidden sm:flex' : 'flex'
        )}
      >
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="size-8" />
        ))}
      </div>
      <div
        className={cn(
          'space-y-2',
          compact ? 'p-3 sm:p-4' : 'h-[min(720px,62dvh)] p-4 sm:p-6'
        )}
        style={compact ? { minHeight: minHeight ?? 160 } : undefined}
      >
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
