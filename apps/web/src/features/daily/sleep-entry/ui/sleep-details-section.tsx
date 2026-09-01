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
 * Inline, never a second modal: two Radix overlays at `bg-black/80` composite
 * to ~96% black and the inner sheet covers the outer. It still has to be
 * FOUND, so the trigger names its fields and counts what is answered.
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
    (entry.awakeningsCount === null ? 0 : 1) +
    (entry.napBucket === null ? 0 : 1) +
    (entry.factors.length === 0 ? 0 : 1) +
    (entry.note.trim() === '' ? 0 : 1);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* `asChild`, so Radix owns `aria-expanded` and `aria-controls`. */}
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
                {/* A landmark, not decoration: among four cards of the same
                    tone this is the only title with a glyph. */}
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

            {/* It rotates because the card genuinely grows now — the one
                thing a chevron pointing down promises. */}
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
        </button>
      </CollapsibleTrigger>

      {/* 12px to the trigger, not the siblings' 24px: one object opening,
          not a fifth block in the stack. */}
      <CollapsibleContent className="mt-3 rounded-3xl border bg-card p-5 shadow">
        <SleepDetailsFields entry={entry} />
      </CollapsibleContent>
    </Collapsible>
  );
}
