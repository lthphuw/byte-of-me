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
 * The sleep half of the day sheet, and the first thing in it.
 *
 * The two clocks lead. They used to sit roughly 700px down a sheet whose own
 * name is sleep — below a mood ramp, a rich-text editor, a photo strip and a
 * 176px duration ring — which on a 390px phone put the one control this
 * surface exists for off screen at open.
 *
 * Native `<input type="time">` rather than a hand-rolled wheel: the platform
 * control is already localized, already accessible, and on a phone it summons
 * the OS time picker.
 *
 * This does not own the form or the Save button — the day sheet's sticky
 * footer holds the only Save on screen, so this takes the hook's return value
 * and renders fields. `key={localDate}` one level up is what resets it.
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
      {/* 64px targets and the largest type among the inputs: these two are the
          only fields that must be hit accurately on a phone held in one hand,
          half awake. They stack below `sm` because a native time control plus
          a Vietnamese label does not fit a 139px column — measured at 316px,
          the control's own content is already 7px wider than its box.

          `appearance-none` is load-bearing on iOS and only there: WebKit gives
          the control an intrinsic min-width `width:100%` cannot shrink below,
          and a 293px cell rendered a 319px control on iOS 26.6.1. */}
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

        {/* Inside the clocks card and below them, because it is a third
            reading of the same night — and it has to be answered while the
            wake time is still the thing on screen. */}
        <div className="sm:col-span-2">
          <RiseTimeRow
            offsetMin={entry.riseOffsetMin}
            onOffsetChange={entry.setRiseOffsetMin}
            customClock={entry.riseClockCustom}
            onCustomClockChange={entry.setRiseClockCustom}
            riseClock={entry.riseClock}
          />
        </div>

        {/* A repair is announced with the typed value still on offer. Silently
            rewriting an entry is how a genuinely unusual night becomes
            impossible to record — undo here also stops the next blur from
            correcting the same value again. */}
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

        {/* On the field rather than only on a disabled Save button two screens
            away. `destructive-text`, not `destructive` — §14 records that the
            fill token measures 3.76:1 as text. */}
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

      {/* Below the clocks and compact. It is the answer to what was just
          typed, so it follows the question — and at 176px in a `p-8` card it
          was the single biggest thing standing between the sheet's top edge
          and the fields the sheet is for. */}
      <SleepDurationHero
        durationMin={entry.durationMin}
        targetMin={targetMin}
      />

      {/* The night, then the morning it produced. Quality rates the sleep and
          restedness rates the person, which is the outcome every insight in
          the next phase is contrasted against — so it sits above the optional
          details and directly under the question it answers. */}
      <SleepQualityScale value={entry.quality} onChange={entry.setQuality} />

      <SleepRestednessScale
        value={entry.restedness}
        onChange={entry.setRestedness}
      />

      <SleepDetailsSection entry={entry} />
    </div>
  );
}
