'use client';

import { Angry, Frown, Laugh, type LucideIcon, Meh, Smile } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

const LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * The ramp, as a face.
 *
 * Angry, Frown, Meh, Smile, Laugh — one lucide family, five steps, and the
 * mouth alone is monotone across them: down-turned, down-turned with flat
 * brows, flat, up-turned, up-turned and open. The brows on `Angry` are what
 * separate it from `Frown`, the closest pair in the set. A face has one
 * advantage nothing else on a hueless palette has: the reader already knows,
 * without being taught, which end of angry→laughing is the good end.
 *
 * **These used to be sleep quality.** They are the day's MOOD now, and sleep
 * quality has become five dots inside the sleep section — because two
 * five-step face scales in one sheet are two pictures with one meaning
 * between them, and the reader has to be told which is which. Renaming rather
 * than aliasing is deliberate: the calendar draws these, and a constant still
 * called `SLEEP_QUALITY_ICON` would make it look like it still draws sleep.
 *
 * Drawn at 32px, not 16. In a single tone at 16px a down-turned mouth and a
 * flat one are the same two pixels and the set collapses into five circles.
 * The calendar draws the same faces at 20px inside a 36px disc for the same
 * reason. Neither carries the meaning alone: the numeral sits under every
 * face and the word is printed live beside the group.
 *
 * Lucide, never an emoji (§14). An emoji is a font the OS chooses — it
 * arrives pre-coloured, at a size nothing here controls, and renders as a
 * different picture on every platform. These inherit `currentColor`, which is
 * what lets the chosen one invert with its button.
 */
export const MOOD_ICON: Record<number, LucideIcon> = {
  1: Angry,
  2: Frown,
  3: Meh,
  4: Smile,
  5: Laugh,
};

/**
 * How the day felt, 1–5 — the first question in the sheet and the largest.
 *
 * Selection INVERTS rather than tints. Every token on this palette is 0%
 * saturation (§14), so a tinted fill lands within a few percent of the
 * unselected surface and is not a state at all.
 *
 * Toggle buttons rather than a radio group, and `role="group"` rather than
 * `radiogroup`, because mood is OPTIONAL and clearable: tapping the current
 * value returns to "not answered", which a radio group has no gesture for.
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
        <span className="text-sm font-medium">{t('day.mood')}</span>
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
