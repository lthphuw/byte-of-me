'use client';

import { Button, Input, Label } from '@byte-of-me/ui';
import { Moon, Sunrise, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { RiseTimeRow } from './rise-time-row';
import { SleepDetailsSection } from './sleep-details-section';
import { SleepDurationHero } from './sleep-duration-hero';
import { SleepQualityScale } from './sleep-quality-scale';
import { SleepRestednessScale } from './sleep-restedness-scale';
import { SleepSuggestionCard } from './sleep-suggestion-card';

import type { useSleepEntry } from '@/features/daily/sleep-entry/model/use-sleep-entry';

/**
 * The sleep half of the day sheet, clocks first — they used to sit ~700px
 * down, off screen at open on a 390px phone. Native `<input type="time">`:
 * localized, accessible, and it summons the OS picker. No form, no Save here.
 */
export function SleepEntryForm({
  entry,
  targetMin,
}: {
  entry: ReturnType<typeof useSleepEntry>;
  targetMin: number;
}) {
  const t = useTranslations('dashboard.daily');

  return (
    <div className="flex flex-col gap-6">
      {/* 64px targets, stacked below `sm`: a Vietnamese label plus a native
          time control does not fit a 139px column.

          `appearance-none` is load-bearing on iOS and only there — WebKit
          gives the control an intrinsic min-width `width:100%` cannot shrink,
          and a 293px cell rendered 319px on iPhone 13 / iOS 26.6.1. */}
      <div className="grid grid-cols-1 gap-3 rounded-3xl border bg-card p-5 shadow sm:grid-cols-2 sm:gap-4">
        {entry.suggestion ? (
          <div className="sm:col-span-2">
            <SleepSuggestionCard
              suggestion={entry.suggestion}
              onAccept={entry.acceptSuggestion}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="sleep-bed-at" className="flex items-center gap-1.5">
            <Moon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            {t('sleep.bedAt')}
          </Label>
          <Input
            id="sleep-bed-at"
            type="time"
            required
            value={entry.bedClock}
            onChange={(event) => entry.setBedClock(event.target.value)}
            onBlur={entry.repairClocks}
            className="h-16 appearance-none rounded-2xl bg-background text-2xl tabular-nums transition-colors duration-200 hover:border-primary/40 md:text-2xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sleep-wake-at" className="flex items-center gap-1.5">
            <Sunrise
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
            {t('sleep.wakeAt')}
          </Label>
          <Input
            id="sleep-wake-at"
            type="time"
            required
            value={entry.wakeClock}
            onChange={(event) => entry.setWakeClock(event.target.value)}
            onBlur={entry.repairClocks}
            className="h-16 appearance-none rounded-2xl bg-background text-2xl tabular-nums transition-colors duration-200 hover:border-primary/40 md:text-2xl"
          />
        </div>

        {/* In the clocks card: a third reading of the same night, answered
            while the wake time is still on screen. */}
        <div className="sm:col-span-2">
          <RiseTimeRow
            offsetMin={entry.riseOffsetMin}
            onOffsetChange={entry.setRiseOffsetMin}
            customClock={entry.riseClockCustom}
            onCustomClockChange={entry.setRiseClockCustom}
            riseClock={entry.riseClock}
          />
        </div>

        {/* Announced, with the typed value still on offer: rewriting silently
            makes a genuinely unusual night impossible to record. */}
        {entry.repairedFrom ? (
          <div
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:col-span-2"
          >
            <span>
              {entry.repairedFrom.field === 'bed'
                ? t('sleep.repairedBed', {
                    from: entry.repairedFrom.from,
                    to: entry.repairedFrom.to,
                  })
                : t('sleep.repairedWake', {
                    from: entry.repairedFrom.from,
                    to: entry.repairedFrom.to,
                  })}
            </span>
            <Button
              type="button"
              variant="link"
              onClick={entry.undoRepair}
              className="h-auto p-0 text-sm underline"
            >
              {t('sleep.repairKeep', { clock: entry.repairedFrom.from })}
            </Button>
          </div>
        ) : null}

        {/* On the field, not only on a disabled Save two screens away.
            `destructive-text`: the fill token is 3.76:1 as text (§14). */}
        {entry.nightIssue ? (
          <p
            role={entry.nightIssue.blocking ? 'alert' : 'status'}
            className={
              entry.nightIssue.blocking
                ? 'text-sm text-destructive-text sm:col-span-2'
                : 'flex items-start gap-2 text-sm text-foreground sm:col-span-2'
            }
          >
            {entry.nightIssue.blocking ? null : (
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            )}
            {entry.nightIssue.message}
          </p>
        ) : null}
      </div>

      {/* Below the clocks, and compact: it is the ANSWER to what was just
          typed, and at 176px it was what pushed the fields off screen. */}
      <SleepDurationHero
        durationMin={entry.durationMin}
        targetMin={targetMin}
      />

      {/* The night, then the morning it produced: quality rates the sleep,
          restedness rates the person — the outcome insights contrast on. */}
      <SleepQualityScale value={entry.quality} onChange={entry.setQuality} />

      <SleepRestednessScale
        value={entry.restedness}
        onChange={entry.setRestedness}
      />

      <SleepDetailsSection entry={entry} />
    </div>
  );
}
