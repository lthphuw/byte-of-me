import { Card, CardContent } from '@byte-of-me/ui';

import { cn } from '@/shared/lib/utils';

/**
 * One number with its name, and optionally the caveat that number carries.
 *
 * Here rather than in either widget that draws it: the health hub and the
 * sleep screen both need the same tile, and a widget importing another
 * widget's internals is the sideways import AGENTS §3 rules out —
 * `SkipToContentLink` is in `shared/ui` for exactly this reason.
 *
 * `value` is a node, not a string, because several of these are a formatted
 * duration next to a unit and one of them is an em dash.
 *
 * The label sits ABOVE the value and the hint below it, so a tile reads in one
 * pass on a phone and the longest string on it — the Vietnamese label — gets
 * the full width of the tile rather than sharing a row with the figure.
 */
export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={cn('h-full', className)}>
      <CardContent className="flex h-full flex-col gap-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums leading-tight">
          {value}
        </p>
        {hint ? (
          <p className="mt-auto pt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
