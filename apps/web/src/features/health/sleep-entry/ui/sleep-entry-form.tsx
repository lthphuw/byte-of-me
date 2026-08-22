'use client';

import { Button, Checkbox, Input, Label, Textarea } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { SLEEP_FACTORS, type SleepFactor } from '@/entities/sleep-log';
import {
  type SleepEntryDefaults,
  useSleepEntry,
} from '@/features/health/sleep-entry/model/use-sleep-entry';
import { splitMinutes } from '@/shared/lib/health/duration';
import { cn } from '@/shared/lib/utils';

/**
 * The morning form. One tap in the common case: both clocks arrive already
 * filled — wake time from now, bedtime from the median of the last fortnight —
 * so waking up, opening the app and pressing Save is both the fastest path and
 * an accurate one.
 *
 * Native `<input type="time">` rather than a hand-rolled wheel. The platform
 * control is already localized, already accessible, already familiar, and on a
 * phone it summons the OS time picker; a custom wheel trades weeks of work and
 * an accessibility risk for aesthetics.
 *
 * The layout follows the module's governing rule — data above, the action at
 * the bottom. This component owns BOTH halves of the screen, rather than the
 * screen owning the scroll area and the form owning a button somewhere inside
 * it, because the save bar has to sit outside the scrolling region to stay put
 * while a fortnight of charts scrolls past it. Whatever the screen renders
 * below the fields arrives as `children` and scrolls with them.
 */
export function SleepEntryForm({
  defaults,
  children,
}: {
  defaults: SleepEntryDefaults;
  children?: React.ReactNode;
}) {
  const t = useTranslations('dashboard.health');
  const entry = useSleepEntry(defaults);

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

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        entry.save();
      }}
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
          {/* 64px targets, and the largest type on the screen: these two are
              the only fields that must be hit accurately on a phone held in
              one hand, half awake. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sleep-bed-at">{t('sleep.bedAt')}</Label>
              <Input
                id="sleep-bed-at"
                type="time"
                required
                value={entry.bedClock}
                onChange={(event) => entry.setBedClock(event.target.value)}
                className="h-16 text-2xl tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sleep-wake-at">{t('sleep.wakeAt')}</Label>
              <Input
                id="sleep-wake-at"
                type="time"
                required
                value={entry.wakeClock}
                onChange={(event) => entry.setWakeClock(event.target.value)}
                className="h-16 text-2xl tabular-nums"
              />
            </div>
          </div>

          {/* Live, because the number the author is actually judging is the
              duration, not either clock — and it is the one figure that tells
              them immediately whether they mistyped a bedtime. */}
          <p
            aria-live="polite"
            className="text-sm tabular-nums text-muted-foreground"
          >
            {t('sleep.duration')}
            {': '}
            <span className="font-medium text-foreground">
              {entry.durationMin === null
                ? '—'
                : t('units.hoursMinutes', splitMinutes(entry.durationMin))}
            </span>
          </p>

          <div className="space-y-2">
            <span className="text-sm font-medium">{t('sleep.quality')}</span>
            <div
              role="group"
              aria-label={t('sleep.quality')}
              className="grid grid-cols-5 gap-2"
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const isActive = entry.quality === value;

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={
                      isActive
                        ? t('sleep.qualityClear')
                        : t('sleep.qualityValue', { value })
                    }
                    // Tapping the current value clears it. Quality is
                    // optional and never blocks a save, so there has to be a
                    // way back to "not answered" once a stray tap has
                    // answered it.
                    onClick={() => entry.setQuality(isActive ? null : value)}
                    className={cn(
                      'h-12 rounded-md border text-base font-medium tabular-nums transition-colors',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background hover:bg-accent'
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>

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
                className="h-11 tabular-nums"
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
                className="h-11 tabular-nums"
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
                      'min-h-11 rounded-full border px-4 text-sm transition-colors',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background hover:bg-accent'
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
            />
          </div>

          {children}
        </div>
      </div>

      {/* Outside the scroll area, so it is where a thumb already is on every
          frame. `env(safe-area-inset-bottom)` keeps it clear of the iOS home
          indicator; `max()` keeps a real gap on everything else. */}
      <div className="shrink-0 border-t bg-background px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto w-full max-w-2xl">
          <Button
            type="submit"
            disabled={!entry.canSave}
            className="h-14 w-full text-base"
          >
            {entry.isSaving ? t('sleep.saving') : t('sleep.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
