'use client';

import { Button, Input, Label } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { SleepDetailsSection } from './sleep-details-section';
import { SleepDurationHero } from './sleep-duration-hero';
import { SleepQualityScale } from './sleep-quality-scale';

import {
  type SleepEntryDefaults,
  useSleepEntry,
} from '@/features/health/sleep-entry/model/use-sleep-entry';

/**
 * The morning form. One tap in the common case: both clocks arrive already
 * filled — bedtime from the median of the last fortnight, wake time from the
 * clock or from the target — so waking up, opening the app and pressing Save
 * is both the fastest path and an accurate one.
 *
 * Native `<input type="time">` rather than a hand-rolled wheel. The platform
 * control is already localized, already accessible, already familiar, and on a
 * phone it summons the OS time picker; a custom wheel trades weeks of work and
 * an accessibility risk for aesthetics.
 *
 * **What the reader meets, in order.** The duration first, at display size,
 * with its target — it is the answer the screen exists to give, and it used to
 * be the smallest text on the page. Then the two clocks that produce it, then
 * quality. Everything else is behind `SleepDetailsSection`.
 *
 * **Two layouts.** Below `lg` this is a phone column with the save bar pinned
 * outside the scroll area, which is why this component owns BOTH halves of the
 * screen rather than the screen owning the scroll area: the bar has to sit
 * outside the scrolling region to stay under a thumb while a fortnight of
 * charts scrolls past. At `lg` — the width at which `/space` shows its icon
 * rail — the entry column and the statistics sit side by side (`aside`), the
 * charts run full width beneath them (`children`), and the pinned bar is
 * replaced by an ordinary submit at the foot of the column it submits. A bar
 * stapled across the bottom of a 27" monitor is a phone pattern wearing a
 * desktop's clothes.
 *
 * Exactly one of the two submit buttons is ever rendered: `hidden` is
 * `display: none`, so the other is not focusable and not in the accessibility
 * tree. There is no width at which the form has two submits.
 *
 * **Airier than it was.** The gaps between the blocks are 24px rather than
 * the old 16–24 mix, the cards carry a 24px radius, and the two clocks sit in
 * their own soft card instead of floating on the page. That is the reference
 * language this module now follows: few controls visible at once, each one
 * large, with room around it. It costs a scroll on a phone and buys a screen
 * that can be used with one hand half awake, which is the only way it ever is.
 */
export function SleepEntryForm({
  defaults,
  targetMin,
  aside,
  children,
}: {
  defaults: SleepEntryDefaults;
  /** The owner's nightly goal, for the hero's arc. Absent when the summary
   *  read failed — the hero then draws a scale but prints no target. */
  targetMin?: number;
  /** The statistics column. Beside the fields at `lg`, beneath them below it. */
  aside?: React.ReactNode;
  /** Full-width content under both columns — the charts. */
  children?: React.ReactNode;
}) {
  const t = useTranslations('dashboard.health');
  const entry = useSleepEntry(defaults);

  const submitButton = (
    <Button
      type="submit"
      disabled={!entry.canSave}
      className="h-14 w-full rounded-2xl text-base"
    >
      {entry.isSaving ? t('sleep.saving') : t('sleep.save')}
    </Button>
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        entry.save();
      }}
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* `max-w-4xl`, the width `SpaceHub` already uses, rather than a third
            container size — and `p-4 md:p-8`, its padding, for the same
            reason. A single column stretched over 1400px is what makes a
            phone layout read as broken on a monitor. */}
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          {/* 2fr / 3fr, not two halves: the entry column holds two time
              fields and a five-step scale and stops being comfortable below
              ~300px, while the statistics column is a 3-up tile row that
              wants every pixel it can have. At `max-w-4xl` that splits 832px
              into roughly 320 / 480. */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-8">
            <div className="flex min-w-0 flex-col gap-6">
              <SleepDurationHero
                durationMin={entry.durationMin}
                targetMin={targetMin}
              />

              {/* 64px targets, and the largest type among the inputs: these
                  two are the only fields that must be hit accurately on a
                  phone held in one hand, half awake. They share one soft card
                  because they are one question — where the night started and
                  where it ended — and the hero above them is the answer. */}
              <div className="grid grid-cols-2 gap-4 rounded-3xl border bg-card p-5 shadow">
                <div className="space-y-2">
                  <Label htmlFor="sleep-bed-at">{t('sleep.bedAt')}</Label>
                  <Input
                    id="sleep-bed-at"
                    type="time"
                    required
                    value={entry.bedClock}
                    onChange={(event) => entry.setBedClock(event.target.value)}
                    className="h-16 rounded-2xl bg-background text-xl tabular-nums transition-colors duration-200 hover:border-primary/40 sm:text-2xl"
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
                    className="h-16 rounded-2xl bg-background text-xl tabular-nums transition-colors duration-200 hover:border-primary/40 sm:text-2xl"
                  />
                </div>
              </div>

              <SleepQualityScale
                value={entry.quality}
                onChange={entry.setQuality}
              />

              <SleepDetailsSection entry={entry} />

              <div className="hidden lg:block">{submitButton}</div>
            </div>

            {/* The rule between entry and statistics exists only while they
                are stacked. At `lg` the two columns already separate them and
                a horizontal line across one of them would read as a mistake. */}
            {aside ? (
              <div className="flex min-w-0 flex-col gap-6 border-t pt-6 lg:border-t-0 lg:pt-0">
                {aside}
              </div>
            ) : null}
          </div>

          {children}
        </div>
      </div>

      {/* Outside the scroll area, so it is where a thumb already is on every
          frame. `env(safe-area-inset-bottom)` keeps it clear of the iOS home
          indicator; `max()` keeps a real gap on everything else. Gone at `lg`,
          where the submit above is the one that exists. */}
      <div className="shrink-0 border-t bg-background px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto w-full max-w-4xl">{submitButton}</div>
      </div>
    </form>
  );
}
