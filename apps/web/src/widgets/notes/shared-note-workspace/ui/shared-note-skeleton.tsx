import { Skeleton } from '@byte-of-me/ui';

/**
 * The document column, loading.
 *
 * Shaped like prose rather than a spinner: a title bar, a short meta line,
 * then paragraph bars of uneven length. A block of equal bars reads as a
 * table; real prose has a ragged right edge, and the placeholder has to have
 * one too or the swap to real text jumps.
 *
 * Deliberately NOT a centred "Loading…" — that discards the layout the reader
 * is about to get and then rebuilds it under them.
 */
export function SharedNoteDocumentSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-3 w-32" />
      </div>

      <div className="flex flex-col gap-3">
        {['w-full', 'w-[92%]', 'w-[97%]', 'w-[64%]'].map((width) => (
          <Skeleton key={width} className={`h-4 ${width}`} />
        ))}
      </div>

      <Skeleton className="h-5 w-1/3" />

      <div className="flex flex-col gap-3">
        {['w-[96%]', 'w-full', 'w-[78%]'].map((width) => (
          <Skeleton key={width} className={`h-4 ${width}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * One inbox row, loading. Matches the real card's height and its three
 * regions — icon, title over byline, role — so the list does not reflow when
 * the data lands.
 */
export function SharedInboxSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-2">
      {[0, 1, 2].map((row) => (
        <li
          key={row}
          className="flex items-center gap-3 rounded-md border px-3 py-3"
        >
          <Skeleton className="size-4 shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-24" />
          </span>
          <Skeleton className="h-3 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  );
}
