'use client';

import { Checkbox, Input, Label, Textarea } from '@byte-of-me/ui';
import { Eye, NotebookPen, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SleepFactorGrid } from './sleep-factor-grid';

import type { useSleepEntry } from '@/features/daily/sleep-entry/model/use-sleep-entry';

/**
 * Everything the morning flow does not need, as fields.
 *
 * Separate from `SleepDetailsSection` so the disclosure and its contents stay
 * one concern each. Every field ids itself, so exactly one copy may ever be
 * mounted — two `#sleep-latency` inputs would point one `<label for>` at
 * whichever came first.
 *
 * A REORGANISATION, not a removal — every field is still bound to the same
 * state in `useSleepEntry`, so nothing typed is lost by collapsing the section.
 */
export function SleepDetailsFields({
  entry,
}: {
  entry: ReturnType<typeof useSleepEntry>;
}) {
  const t = useTranslations('dashboard.daily');

  return (
    <div className="flex flex-col gap-6">
      {/* Both optional, and their absence is meaningful rather than zero:
          with neither recorded the screens WITHHOLD efficiency instead of
          reporting 100%.

          Two figures in minutes, side by side, whose labels differ only in
          their words — so a stopwatch for the time it took to go under, and an
          open eye for the minutes spent out of it again. The mark is what
          tells them apart before either label is read; the label is still what
          says which is which, so both glyphs are `aria-hidden`.

          Stacked below `sm`, the same rule the two clocks follow: inside this
          card on a 316px viewport a half-width column is 110px, which the
          Vietnamese labels ("Thời gian vào giấc") do not fit. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sleep-latency" className="flex items-center gap-1.5">
            <Timer
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
            {t('sleep.latency')}
          </Label>
          <Input
            id="sleep-latency"
            type="number"
            inputMode="numeric"
            min={0}
            max={720}
            value={entry.latency}
            onChange={(event) => entry.setLatency(event.target.value)}
            className="h-12 rounded-2xl bg-background tabular-nums"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="sleep-awakenings"
            className="flex items-center gap-1.5"
          >
            <Eye
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
            {t('sleep.awakenings')}
          </Label>
          <Input
            id="sleep-awakenings"
            type="number"
            inputMode="numeric"
            min={0}
            max={720}
            value={entry.awakenings}
            onChange={(event) => entry.setAwakenings(event.target.value)}
            className="h-12 rounded-2xl bg-background tabular-nums"
          />
        </div>
      </div>

      <SleepFactorGrid selected={entry.factors} onToggle={entry.toggleFactor} />

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
          onCheckedChange={(checked) => entry.setIsFreeDay(checked === true)}
        />
        {t('sleep.freeDay')}
      </Label>

      <div className="space-y-2">
        <Label htmlFor="sleep-note" className="flex items-center gap-1.5">
          <NotebookPen
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          {t('sleep.note')}
        </Label>
        <Textarea
          id="sleep-note"
          rows={2}
          value={entry.note}
          onChange={(event) => entry.setNote(event.target.value)}
          className="rounded-2xl bg-background"
        />
      </div>
    </div>
  );
}
