'use client';

import { Checkbox, Label, Textarea } from '@byte-of-me/ui';
import { Eye, NotebookPen, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BucketChipRow } from './bucket-chip-row';
import { SleepFactorGrid } from './sleep-factor-grid';

import {
  AWAKE_BUCKETS,
  LATENCY_BUCKETS,
} from '@/features/daily/sleep-entry/lib/sleep-buckets';
import type { useSleepEntry } from '@/features/daily/sleep-entry/model/use-sleep-entry';

/**
 * Everything the morning flow does not need, as fields.
 *
 * Separate from `SleepDetailsSection` so the disclosure and its contents stay
 * one concern each. Every field ids itself, so exactly one copy may ever be
 * mounted — two `#sleep-note` textareas would point one `<label for>` at
 * whichever came first.
 */
export function SleepDetailsFields({
  entry,
}: {
  entry: ReturnType<typeof useSleepEntry>;
}) {
  const t = useTranslations('dashboard.daily');

  // Literal keys, one per bucket: next-intl's generated declarations only
  // type-check literals, so an interpolated key would check against nothing.
  const latencyLabels: Record<string, string> = {
    lt5: t('sleep.latencyLt5'),
    from5: t('sleep.latency5to15'),
    from15: t('sleep.latency15to30'),
    from30: t('sleep.latency30to60'),
    from60: t('sleep.latencyOver60'),
  };
  const awakeLabels: Record<string, string> = {
    zero: t('sleep.awakeNone'),
    lt15: t('sleep.awakeLt15'),
    from15: t('sleep.awake15to30'),
    from30: t('sleep.awakeOver30'),
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Buckets, not minute spinners. The Consensus Sleep Diary instructs the
          diarist not to watch the clock, so a range is the more faithful
          record — and a numeric keyboard would cover the sticky footer the
          Save button sits in, the defect `NumpadSheet` exists for. */}
      <div className="space-y-4">
        <BucketChipRow
          id="sleep-latency-label"
          label={t('sleep.latency')}
          icon={Timer}
          buckets={LATENCY_BUCKETS}
          optionLabels={latencyLabels}
          clearLabel={t('sleep.bucketClear')}
          value={entry.latency}
          onChange={entry.setLatency}
        />

        <BucketChipRow
          id="sleep-awakenings-label"
          label={t('sleep.awakenings')}
          icon={Eye}
          buckets={AWAKE_BUCKETS}
          optionLabels={awakeLabels}
          clearLabel={t('sleep.bucketClear')}
          value={entry.awakenings}
          onChange={entry.setAwakenings}
        />

        <p className="text-xs text-muted-foreground">
          {t('sleep.estimateHint')}
        </p>
      </div>

      <SleepFactorGrid selected={entry.factors} onToggle={entry.toggleFactor} />

      {/* Shown rather than inferred from the weekday: it is an input to social
          jetlag, and a holiday or a night shift makes the weekday a wrong
          guess. Pre-ticked at the weekend, still editable. */}
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
