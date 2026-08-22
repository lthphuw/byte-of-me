import { Card, CardContent } from '@byte-of-me/ui';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

/**
 * One number with its name, the context that makes it mean something, and
 * optionally the caveat it carries.
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
 *
 * **Depth.** A flat fill on a flat page gives a reader nothing to separate a
 * figure from the sheet it is printed on, which is how six of these in a grid
 * came to read as one grey block. `Card` already carries the two cues that fix
 * it — a hairline border and a single soft drop shadow, one light source, no
 * inset highlight — against `bg-muted/40`, the ground `SpaceShell` paints, so
 * the tile reads as raised rather than as a hole. The border darkens on hover,
 * which is affordance only: every tile's value is on the tile at rest, because
 * there is no hover on the phone this module is built for.
 *
 * `icon` is a Lucide component, never an emoji (§14), and is `aria-hidden` —
 * it repeats the label rather than adding to it.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  context,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  /** What the number is measured against — a target, a delta, a meter, a run
   *  of dots. Rendered under the value, above the hint. */
  context?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'h-full transition-colors duration-200 hover:border-primary/40',
        className
      )}
    >
      <CardContent className="flex h-full flex-col gap-1 p-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
          <span className="break-safe min-w-0">{label}</span>
        </p>

        <p className="text-2xl font-semibold tabular-nums leading-tight">
          {value}
        </p>

        {context}

        {hint ? (
          <p className="mt-auto pt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * A fraction of a whole, as a bar under the figure it qualifies.
 *
 * The bar is redundant by design — `label` states the same thing in words
 * directly beneath it — because a reader who cannot see the fill still has to
 * be able to read the tile. That is the same rule the quality scale follows.
 */
export function StatMeter({
  fraction,
  label,
}: {
  /** 0..1, clamped. */
  fraction: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(1, fraction));

  return (
    <div className="mt-1 flex flex-col gap-1">
      <div aria-hidden className="h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * The last N nights as a run of dots — solid for a night that was logged, an
 * empty well for one that was not.
 *
 * `bg-primary` against `bg-muted` rather than a solid against a hairline ring:
 * a 8px dot outlined in `border-border` is close to invisible at rest, and
 * these dots are the only thing on the tile that says whether the fortnight
 * behind the streak was solid or empty.
 *
 * A streak of 3 says nothing about whether the fortnight before it was solid
 * or empty; this is the smallest mark that answers that. `label` carries the
 * same fact as text for anyone who is not reading the dots.
 */
export function StatDots({
  filled,
  label,
}: {
  filled: boolean[];
  label: string;
}) {
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <div aria-hidden className="flex items-center gap-1">
        {filled.map((isFilled, i) => (
          <span
            key={i}
            className={cn(
              'size-2 rounded-full',
              isFilled ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
