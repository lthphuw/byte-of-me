'use client';

import { Angry, Frown, Laugh, type LucideIcon, Meh, Smile } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

const LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * The DAY's mood, not sleep quality — that is five dots in the sleep section,
 * because two face ramps in one sheet are two pictures with one meaning. The
 * mouth is monotone across the five; `Angry` is told from `Frown` by its brows.
 *
 * Drawn at 32px: in one tone at 16px a down-turned mouth and a flat one are
 * the same two pixels. Lucide, never an emoji (§14) — these have to invert
 * with their button, and an emoji arrives pre-coloured.
 */
export const MOOD_ICON: Record<number, LucideIcon> = {
  1: Angry,
  2: Frown,
  3: Meh,
  4: Smile,
  5: Laugh,
};

/**
 * How the day felt, 1–5. Selection INVERTS rather than tints: at 0%
 * saturation (§14) a tinted fill is not a state. Toggle buttons in a `group`,
 * not a `radiogroup` — mood is clearable, which a radio group cannot gesture.
 */
export function MoodScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const t = useTranslations('dashboard.daily');

  // Literal keys, one per level. next-intl's generated declarations only
  // type-check literals, so an interpolated key would type-check against
  // nothing and happily ship a key that does not exist.
  const levelLabels: Record<number, string> = {
    1: t('day.moodLevel1'),
    2: t('day.moodLevel2'),
    3: t('day.moodLevel3'),
    4: t('day.moodLevel4'),
    5: t('day.moodLevel5'),
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        {/* A heading, not a span: this is one of the sheet's four sections and
            the only navigable landmark it has. Same weight as before. */}
        <h3 className="text-sm font-medium">{t('day.mood')}</h3>
        {/* The word, live. It is the half of this control that survives with
            no colour and no shape. */}
        <span
          aria-live="polite"
          className={cn(
            'truncate text-sm',
            value === null
              ? 'text-muted-foreground'
              : 'font-medium text-foreground'
          )}
        >
          {value === null ? t('day.moodNone') : levelLabels[value]}
        </span>
      </div>

      <div
        role="group"
        aria-label={t('day.mood')}
        className="grid grid-cols-5 gap-2"
      >
        {LEVELS.map((level) => {
          const isActive = value === level;
          const Icon = MOOD_ICON[level];

          return (
            <button
              key={level}
              type="button"
              aria-pressed={isActive}
              aria-label={
                isActive
                  ? t('day.moodClear')
                  : `${t('day.moodValue', { value: level })} — ${levelLabels[level]}`
              }
              onClick={() => onChange(isActive ? null : level)}
              className={cn(
                'flex h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border',
                'transition-[background-color,border-color,color,transform] duration-200 ease-out motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                'active:scale-[0.96] motion-reduce:active:scale-100',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon aria-hidden className="size-8 shrink-0" />
              <span
                className={cn(
                  'text-[11px] leading-none tabular-nums',
                  isActive ? 'font-semibold' : 'font-medium'
                )}
              >
                {level}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
