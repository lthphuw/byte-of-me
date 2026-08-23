'use client';

import { Input, Label } from '@byte-of-me/ui';
import { Moon, Sunrise } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SleepDetailsSection } from './sleep-details-section';
import { SleepDurationHero } from './sleep-duration-hero';
import { SleepQualityScale } from './sleep-quality-scale';

import type { useSleepEntry } from '@/features/daily/sleep-entry/model/use-sleep-entry';

/**
 * The sleep half of the day sheet. One tap in the common case: both clocks
 * arrive already filled — bedtime from the median of the last fortnight, wake
 * time from the clock or from the target — so waking up, opening the app and
 * pressing Save is both the fastest path and an accurate one.
 *
 * Native `<input type="time">` rather than a hand-rolled wheel. The platform
 * control is already localized, already accessible, already familiar, and on
 * a phone it summons the OS time picker; a custom wheel trades weeks of work
 * and an accessibility risk for aesthetics.
 *
 * **This no longer owns the form or the Save button.** It used to be the
 * whole screen — the month calendar led it, a save bar was pinned under it —
 * and both of those moved out: the calendar opens a modal now instead of
 * loading a form below itself, and that modal's footer holds the only Save
 * button on the sheet. Two of them, one sticky inside a sheet that already
 * has its own sticky footer, is the second background the owner already
 * objected to once. So this component takes the hook's return value rather
 * than building it, and renders only the fields — the caller decides when to
 * mount it (`key={localDate}` is what resets it, one level up) and when to
 * save it.
 *
 * **One rhythm, four cards.** The gaps between the blocks are 24px, and every
 * block is the SAME object: a 24px-radius `bg-card` sheet with a hairline
 * border and one soft shadow — the hero, the two clocks, the quality scale
 * and the details trigger. Nothing on this palette but corner, shadow and air
 * separates a surface from the ground it sits on (§14), so the column spends
 * all three consistently or it stops reading as a stack.
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
      <SleepDurationHero durationMin={entry.durationMin} targetMin={targetMin} />

      {/* 64px targets, and the largest type among the inputs: these two are
          the only fields that must be hit accurately on a phone held in one
          hand, half awake. They share one soft card because they are one
          question — where the night started and where it ended — and the
          hero above them is the answer.

          They stack by default and pair up again only at `sm` (640px). A
          native time control plus a Vietnamese label ("Giờ thức dậy") does
          not fit a half-width column on a 390px phone: measured at a 316px
          viewport, the input's own content is already 7px wider than the box
          it sits in, in Chrome, and Safari on iOS draws the control wider
          still, so the spill is what reads as the two fields overlapping.
          Stacked, each field gets the card's full interior instead of a
          139px column, which is more than the control needs anywhere, and
          `sm:grid-cols-2` restores the pair the instant there is room for
          it. Resist "tidying" this back to an unconditional `grid-cols-2`.

          The shared `Input` base class ends in `md:text-sm`, so any caller
          wanting a size bigger than that at `md` and up has to say so at
          `md:` too — an unprefixed override loses that cascade fight no
          matter where it sits in the class string. Both inputs here had
          silently been rendering at 14px on desktop; `md:text-2xl` alongside
          `text-2xl` is what actually restores "the largest type among the
          inputs" from `sm` on up.

          The moon and the sunrise are the same two marks the bedtime and
          wake-variation tiles wear in `SleepRegularity`. One vocabulary
          across the module: whatever a glyph means on one screen it means on
          the other, which is the only thing that makes a picture faster to
          read than the word beside it. Both are `aria-hidden` — the label
          still says which field this is. */}
      <div className="grid grid-cols-1 gap-3 rounded-3xl border bg-card p-5 shadow sm:grid-cols-2 sm:gap-4">
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
            className="h-16 rounded-2xl bg-background text-2xl tabular-nums transition-colors duration-200 hover:border-primary/40 md:text-2xl"
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
            className="h-16 rounded-2xl bg-background text-2xl tabular-nums transition-colors duration-200 hover:border-primary/40 md:text-2xl"
          />
        </div>
      </div>

      <SleepQualityScale value={entry.quality} onChange={entry.setQuality} />

      <SleepDetailsSection entry={entry} />
    </div>
  );
}
