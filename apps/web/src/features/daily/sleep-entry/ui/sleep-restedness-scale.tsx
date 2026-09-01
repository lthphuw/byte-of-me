'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

const LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * How rested you feel now, 1–5. Deliberately the same shape as
 * `SleepQualityScale`: the two are a pair — the night, then the morning it
 * produced — and a different gesture would read as a different KIND of answer.
 */
export function SleepRestednessScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const t = useTranslations('dashboard.daily');

  const levelLabels: Record<number, string> = {
    1: t('sleep.restednessLevel1'),
    2: t('sleep.restednessLevel2'),
    3: t('sleep.restednessLevel3'),
    4: t('sleep.restednessLevel4'),
    5: t('sleep.restednessLevel5'),
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium">{t('sleep.restedness')}</h4>
        <span
          aria-live="polite"
          className={cn(
            'truncate text-sm',
            value === null
              ? 'text-muted-foreground'
              : 'font-medium text-foreground'
          )}
        >
          {value === null ? t('sleep.restednessNone') : levelLabels[value]}
        </span>
      </div>

      <div
        role="group"
        aria-label={t('sleep.restedness')}
        className="flex items-center gap-2"
      >
        {LEVELS.map((level) => {
          const isFilled = value !== null && level <= value;
          const isActive = value === level;

          return (
            <button
              key={level}
              type="button"
              aria-pressed={isActive}
              aria-label={
                isActive
                  ? t('sleep.restednessClear')
                  : `${t('sleep.restednessValue', { value: level })} — ${levelLabels[level]}`
              }
              onClick={() => onChange(isActive ? null : level)}
              // 44px of target around an 18px dot, matching the quality scale
              // exactly — the two rows sit one above the other.
              className={cn(
                'flex size-11 items-center justify-center rounded-full',
                'transition-transform duration-200 ease-out motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                'active:scale-90 motion-reduce:active:scale-100'
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'size-[18px] rounded-full border-2 transition-colors duration-200 motion-reduce:transition-none',
                  isFilled
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/40 bg-transparent'
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
