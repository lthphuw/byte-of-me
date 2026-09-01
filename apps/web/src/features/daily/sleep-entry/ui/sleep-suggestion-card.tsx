'use client';

import { Button } from '@byte-of-me/ui';
import { History } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SleepSuggestion } from '@/features/daily/sleep-entry/model/use-sleep-entry';

/**
 * The fortnight's habit, offered rather than assumed.
 *
 * One tap fills both clocks and whichever of the two estimates the last
 * fortnight actually recorded, and the card retires itself the moment it is
 * taken — so it reads as a suggestion right up until it becomes an answer.
 * The figures are printed because a number the reader cannot see before
 * accepting it is a pre-filled field with extra steps.
 */
export function SleepSuggestionCard({
  suggestion,
  onAccept,
}: {
  suggestion: SleepSuggestion;
  onAccept: () => void;
}) {
  const t = useTranslations('dashboard.daily');

  // Every figure the tap would take, printed before it is taken. Restedness is
  // absent by design — it is the outcome, and suggesting it back would fill in
  // the one answer that has to be observed.
  const extras = [
    suggestion.riseOffsetMin === 0
      ? null
      : t('sleep.suggestionRise', { minutes: suggestion.riseOffsetMin }),
    suggestion.latencyMin === null
      ? null
      : t('sleep.suggestionLatency', { minutes: suggestion.latencyMin }),
    suggestion.awakeningsMin === null
      ? null
      : t('sleep.suggestionAwake', { minutes: suggestion.awakeningsMin }),
    suggestion.awakeningsCount === null
      ? null
      : t('sleep.suggestionAwakenings', { n: suggestion.awakeningsCount }),
  ].filter((line): line is string => line !== null);

  return (
    <div className="space-y-3 rounded-2xl border border-dashed bg-muted/40 p-4">
      <div className="space-y-1">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <History aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {t('sleep.suggestion')}
        </span>
        <p className="text-lg font-semibold tabular-nums">
          {t('sleep.suggestionClocks', {
            bed: suggestion.bedClock,
            wake: suggestion.wakeClock,
          })}
        </p>
        <p className="text-xs text-muted-foreground">
          {extras.length === 0
            ? t('sleep.suggestionHint')
            : `${t('sleep.suggestionHint')} · ${extras.join(' · ')}`}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onAccept}
        className="h-11 w-full rounded-full bg-background"
      >
        {t('sleep.suggestionAccept')}
      </Button>
    </div>
  );
}
