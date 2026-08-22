'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  Textarea,
} from '@byte-of-me/ui';
import { scrollIntoViewBehavior } from '@byte-of-me/ui/lib/prefers-reduced-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SLEEP_FACTORS, type SleepFactor } from '@/entities/sleep-log';
import type { useSleepEntry } from '@/features/health/sleep-entry/model/use-sleep-entry';
import { cn } from '@/shared/lib/utils';

/**
 * Everything the morning flow does not need.
 *
 * Seven fields stacked vertically made a once-a-morning task look like a
 * form to be filled in. Bedtime, wake time and quality are the whole common
 * path; time-to-fall-asleep, minutes awake, the factor chips, the free-day
 * flag and the note are corrections and context, and belong behind one tap.
 *
 * A REORGANISATION, not a removal — every field is still here, still in the
 * tab order once open, still bound to the same state. Closed, Radix unmounts
 * the content; the values live in `useSleepEntry`, so nothing typed is lost by
 * collapsing the section again.
 *
 * The section has to be FOUND, though, or efficiency is never computable
 * again: latency and minutes awake are the two inputs that entitle the screens
 * to print an efficiency figure at all, and a closed section nobody opens is
 * the same as deleting them. Three things work against that — the trigger
 * names what is inside rather than saying only "Details", it counts the fields
 * already answered, and while efficiency is still uncomputable it says so
 * underneath, at rest, on the closed section.
 */
export function SleepDetailsSection({
  entry,
}: {
  entry: ReturnType<typeof useSleepEntry>;
}) {
  const t = useTranslations('dashboard.health');
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Literal keys, one per factor. next-intl's generated declarations only
  // type-check literals, so a `t(`factors.${code}`)` in the map below would
  // type-check against nothing and happily ship a key that does not exist —
  // the same reason `use-space-nav-items.ts` spells its labels out.
  const factorLabels: Record<SleepFactor, string> = {
    caffeine_late: t('factors.caffeine_late'),
    alcohol: t('factors.alcohol'),
    screen_late: t('factors.screen_late'),
    late_meal: t('factors.late_meal'),
    workout_late: t('factors.workout_late'),
    ill: t('factors.ill'),
  };

  const filledCount =
    (entry.latency.trim() === '' ? 0 : 1) +
    (entry.awakenings.trim() === '' ? 0 : 1) +
    (entry.factors.length === 0 ? 0 : 1) +
    (entry.note.trim() === '' ? 0 : 1);

  const efficiencyUnavailable =
    entry.latency.trim() === '' && entry.awakenings.trim() === '';

  // Opened content lands below the fold on a phone often enough that the tap
  // otherwise appears to do nothing. `block: 'nearest'` moves the page only
  // when the section is actually cut off, and the behaviour comes from the
  // shared helper because a literal `'smooth'` animates whatever the user's
  // reduced-motion setting says (§14).
  useEffect(() => {
    if (!open) return;

    contentRef.current?.scrollIntoView({
      behavior: scrollIntoViewBehavior(),
      block: 'nearest',
    });
  }, [open]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border bg-card shadow-sm"
    >
      <CollapsibleTrigger
        className={cn(
          'flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-4 py-3 text-left',
          'transition-colors duration-200 hover:bg-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        )}
      >
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            {t('sleep.details')}
            {filledCount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary-foreground">
                {t('sleep.detailsFilled', { n: filledCount })}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {t('sleep.detailsSummary')}
          </span>
        </div>

        <ChevronDown
          aria-hidden
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>

      {efficiencyUnavailable && !open ? (
        <p className="px-4 pb-3 text-xs text-muted-foreground">
          {t('sleep.detailsEfficiencyHint')}
        </p>
      ) : null}

      <CollapsibleContent ref={contentRef}>
        <div className="flex flex-col gap-5 border-t p-4">
          {/* Both optional, and their absence is meaningful rather than zero:
              with neither recorded the screens WITHHOLD efficiency instead of
              reporting 100%. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sleep-latency">{t('sleep.latency')}</Label>
              <Input
                id="sleep-latency"
                type="number"
                inputMode="numeric"
                min={0}
                max={720}
                value={entry.latency}
                onChange={(event) => entry.setLatency(event.target.value)}
                className="h-11 bg-background tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sleep-awakenings">{t('sleep.awakenings')}</Label>
              <Input
                id="sleep-awakenings"
                type="number"
                inputMode="numeric"
                min={0}
                max={720}
                value={entry.awakenings}
                onChange={(event) => entry.setAwakenings(event.target.value)}
                className="h-11 bg-background tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">{t('sleep.factors')}</span>
            <div
              role="group"
              aria-label={t('sleep.factors')}
              className="flex flex-wrap gap-2"
            >
              {SLEEP_FACTORS.map((factor) => {
                const isActive = entry.factors.includes(factor);

                return (
                  <button
                    key={factor}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => entry.toggleFactor(factor)}
                    className={cn(
                      'min-h-11 rounded-full border px-4 text-sm',
                      'transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      // Inverted, not tinted — the same reason the quality
                      // scale inverts: an achromatic tint is not a state.
                      isActive
                        ? 'border-primary bg-primary font-medium text-primary-foreground'
                        : 'bg-background hover:border-primary/40 hover:bg-muted'
                    )}
                  >
                    {factorLabels[factor]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shown rather than inferred from the weekday: it is an input to
              social jetlag, and a holiday or a night shift makes the weekday a
              wrong guess. Pre-ticked at the weekend, still editable. */}
          <Label
            htmlFor="sleep-free-day"
            className="flex min-h-11 items-center gap-3 text-sm font-normal"
          >
            <Checkbox
              id="sleep-free-day"
              checked={entry.isFreeDay}
              onCheckedChange={(checked) =>
                entry.setIsFreeDay(checked === true)
              }
            />
            {t('sleep.freeDay')}
          </Label>

          <div className="space-y-2">
            <Label htmlFor="sleep-note">{t('sleep.note')}</Label>
            <Textarea
              id="sleep-note"
              rows={2}
              value={entry.note}
              onChange={(event) => entry.setNote(event.target.value)}
              className="bg-background"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
