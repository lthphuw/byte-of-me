'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

const LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * How the night felt, 1–5 — five dots, not the faces, which ask about the DAY
 * in `MoodScale`. Two face ramps in one sheet compete for one meaning; a
 * filled dot is a level on a scale and nothing else.
 *
 * Filled up to the level and hollow past it, so it reads as a bar and the
 * count carries the value without hue (§14). Retap clears: quality is
 * optional, so a stray tap needs a way back to "not answered".
 */
export function SleepQualityScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const t = useTranslations('dashboard.daily');

  const levelLabels: Record<number, string> = {
    1: t('sleep.qualityLevel1'),
    2: t('sleep.qualityLevel2'),
    3: t('sleep.qualityLevel3'),
    4: t('sleep.qualityLevel4'),
    5: t('sleep.qualityLevel5'),
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        {/* A real heading, at the depth this control actually sits: the sheet
            titles itself `h2` and the sleep section `h3`, so the sheet is
            navigable by heading rather than by scrolling past four spans. */}
        <h4 className="text-sm font-medium">{t('sleep.quality')}</h4>
        <span
          aria-live="polite"
          className={cn(
            'truncate text-sm',
            value === null
              ? 'text-muted-foreground'
              : 'font-medium text-foreground'
          )}
        >
          {value === null ? t('sleep.qualityNone') : levelLabels[value]}
        </span>
      </div>

      <div
        role="group"
        aria-label={t('sleep.quality')}
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
                  ? t('sleep.qualityClear')
                  : `${t('sleep.qualityValue', { value: level })} — ${levelLabels[level]}`
              }
              onClick={() => onChange(isActive ? null : level)}
              // 44px of target around an 18px dot. The dot is the mark; the
              // button is the thing a thumb has to hit.
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
