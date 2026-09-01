'use client';

import { Checkbox, Label, Textarea } from '@byte-of-me/ui';
import { Coffee, Eye, NotebookPen, RotateCcw, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BucketChipRow } from './bucket-chip-row';
import { SleepFactorGrid } from './sleep-factor-grid';

import { NAP_BUCKETS } from '@/entities/sleep-log';
import {
  AWAKE_BUCKETS,
  AWAKENINGS_COUNT_BUCKETS,
  bucketIdOf,
  bucketValueOf,
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
  const awakeningsCountLabels: Record<string, string> = {
    zero: t('sleep.awakeningsCount0'),
    one: t('sleep.awakeningsCount1'),
    two: t('sleep.awakeningsCount2'),
    threePlus: t('sleep.awakeningsCount3Plus'),
  };
  const napLabels: Record<string, string> = {
    none: t('sleep.napNone'),
    lt30: t('sleep.napLt30'),
    '30to60': t('sleep.nap30to60'),
    gt60: t('sleep.napOver60'),
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
          options={LATENCY_BUCKETS}
          optionLabels={latencyLabels}
          clearLabel={t('sleep.bucketClear')}
          activeId={bucketIdOf(entry.latency, LATENCY_BUCKETS)}
          onSelect={(id) => entry.setLatency(bucketValueOf(id, LATENCY_BUCKETS))}
        />

        <BucketChipRow
          id="sleep-awakenings-label"
          label={t('sleep.awakenings')}
          icon={Eye}
          options={AWAKE_BUCKETS}
          optionLabels={awakeLabels}
          clearLabel={t('sleep.bucketClear')}
          activeId={bucketIdOf(entry.awakenings, AWAKE_BUCKETS)}
          onSelect={(id) => entry.setAwakenings(bucketValueOf(id, AWAKE_BUCKETS))}
        />

        {/* Beside the minutes, not instead of them: four brief wakings and one
            long one can share a minute total and are not the same night. */}
        <BucketChipRow
          id="sleep-awakenings-count-label"
          label={t('sleep.awakeningsCount')}
          icon={RotateCcw}
          options={AWAKENINGS_COUNT_BUCKETS}
          optionLabels={awakeningsCountLabels}
          clearLabel={t('sleep.bucketClear')}
          activeId={bucketIdOf(entry.awakeningsCount, AWAKENINGS_COUNT_BUCKETS)}
          onSelect={(id) =>
            entry.setAwakeningsCount(
              bucketValueOf(id, AWAKENINGS_COUNT_BUCKETS)
            )
          }
        />

        <p className="text-xs text-muted-foreground">
          {t('sleep.estimateHint')}
        </p>
      </div>

      {/* Stored as the id itself, never a midpoint — and it enters no figure.
          An unrecorded nap corrupts duration and debt; a nap ADDED to the
          night's total inflates both, which is the worse of the two. */}
      <div className="space-y-2">
        <BucketChipRow
          id="sleep-naps-label"
          label={t('sleep.naps')}
          icon={Coffee}
          options={NAP_BUCKETS.map((id) => ({ id }))}
          optionLabels={napLabels}
          clearLabel={t('sleep.bucketClear')}
          activeId={entry.napBucket}
          onSelect={(id) =>
            entry.setNapBucket(NAP_BUCKETS.find((nap) => nap === id) ?? null)
          }
        />
        <p className="text-xs text-muted-foreground">{t('sleep.napsHint')}</p>
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
