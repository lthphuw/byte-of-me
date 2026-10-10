const CELLS = 5;

const numberFormat = new Intl.NumberFormat('en-US');

/**
 * `+A −D` with a five-cell bar, the same shorthand GitHub's diff header uses.
 * The numbers carry the meaning; the bar is a glanceable echo of the ratio, so
 * it is hidden from assistive tech rather than described twice.
 */
export function Diffstat({
  additions,
  deletions,
}: {
  additions: number;
  deletions: number;
}) {
  const total = additions + deletions;
  // At least one cell for each side that has any lines, so a 1,000:1 change
  // still shows that something was removed.
  let added = total === 0 ? 0 : Math.round((additions / total) * CELLS);
  if (additions > 0) added = Math.max(added, 1);
  if (deletions > 0) added = Math.min(added, CELLS - 1);
  const removed = deletions > 0 ? CELLS - added : 0;

  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <span className="text-xs font-medium text-primary">
        +{numberFormat.format(additions)}
      </span>
      <span className="text-xs font-medium text-muted-foreground">
        −{numberFormat.format(deletions)}
      </span>
      <span aria-hidden className="flex gap-px">
        {Array.from({ length: CELLS }, (_, i) => (
          <span
            key={i}
            className={
              i < added
                ? 'h-2 w-2 rounded-[2px] bg-primary'
                : i < added + removed
                ? 'h-2 w-2 rounded-[2px] bg-muted-foreground/50'
                : 'h-2 w-2 rounded-[2px] bg-border'
            }
          />
        ))}
      </span>
    </span>
  );
}
