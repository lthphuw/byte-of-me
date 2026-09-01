'use client';

import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@byte-of-me/ui';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SleepDetailsFields } from './sleep-details-fields';

import type { useSleepEntry } from '@/features/daily/sleep-entry/model/use-sleep-entry';
import { cn } from '@/shared/lib/utils';

/**
 * Everything the morning flow does not need, behind one tap.
 *
 * Inline, never a second modal: the day sheet is already one, and two Radix
 * overlays at `bg-black/80` composite to ~96% black with the inner sheet
 * covering the outer. Save lives in that sheet's own sticky footer, so
 * expanding here no longer pushes it down the page — the defect that sent this
 * section into a sheet in the first place.
 *
 * The section still has to be FOUND, or efficiency stops being computable:
 * latency and minutes awake are its only two inputs, and a section nobody opens
 * is the same as deleting them. Hence a trigger that names what is inside,
 * counts what is already filled, and says why it matters while it still does.
 */
export function SleepDetailsSection({
  entry,
}: {
  entry: ReturnType<typeof useSleepEntry>;
}) {
  const t = useTranslations('dashboard.daily');
  const [open, setOpen] = useState(false);

  const filledCount =
    (entry.latency === null ? 0 : 1) +
    (entry.awakenings === null ? 0 : 1) +
    (entry.factors.length === 0 ? 0 : 1) +
    (entry.note.trim() === '' ? 0 : 1);

  const efficiencyUnavailable =
    entry.latency === null && entry.awakenings === null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* `asChild`, so Radix owns `aria-expanded` and `aria-controls` on this
          button. `type="button"`: these fields sit inside the day sheet, and a
          bare button in a form submits it. */}
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'group w-full rounded-3xl border bg-card px-5 py-4 text-left shadow',
            'transition-colors duration-200 motion-reduce:transition-none hover:bg-muted active:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          )}
        >
          <span className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                {/* A landmark, not decoration: this card's whole problem is
                    being FOUND, and among four rounded cards of near-identical
                    tone it is the only one with a glyph in its title. */}
                <SlidersHorizontal
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                {t('sleep.details')}
                {filledCount > 0 ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary-foreground">
                    {t('sleep.detailsFilled', { n: filledCount })}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {t('sleep.detailsSummary')}
              </span>
            </span>

            {/* A chevron again, and it rotates: the card genuinely grows and
                reveals what is under it now, which is the one thing a chevron
                pointing down promises. It sits in its own hairline disc because
                that is the only control boundary drawn on this card. */}
            <span
              aria-hidden
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground',
                'transition-colors duration-200 motion-reduce:transition-none',
                'group-hover:border-primary/40 group-hover:text-foreground'
              )}
            >
              <ChevronDown
                className={cn(
                  'size-4 transition-transform duration-200 motion-reduce:transition-none',
                  open && 'rotate-180'
                )}
              />
            </span>
          </span>

          {efficiencyUnavailable ? (
            <span className="mt-2 block text-xs text-muted-foreground">
              {t('sleep.detailsEfficiencyHint')}
            </span>
          ) : null}
        </button>
      </CollapsibleTrigger>

      {/* Its own card, tied to the trigger by a 12px gap rather than the 24px
          the sibling blocks use — one object opening, not a fifth block in the
          stack. */}
      <CollapsibleContent className="mt-3 rounded-3xl border bg-card p-5 shadow">
        <SleepDetailsFields entry={entry} />
      </CollapsibleContent>
    </Collapsible>
  );
}
