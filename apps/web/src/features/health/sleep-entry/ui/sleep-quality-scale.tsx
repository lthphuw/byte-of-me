'use client';

import { Angry, Frown, Laugh, type LucideIcon, Meh, Smile } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

const LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * The ramp, as a face.
 *
 * This was a night sky clearing — a storm, drizzle, a clouded moon, a moon, a
 * moon with stars. It read as a WEATHER FORECAST, which is what the reader is
 * shown everywhere else those five pictures appear, and the question is not
 * what the night was like outside. A face has one advantage nothing else on a
 * hueless palette has: the reader already knows, without being taught, which
 * end of angry→laughing is the good end.
 *
 * Angry, Frown, Meh, Smile, Laugh — one lucide family, five steps, and the
 * mouth alone is monotone across them: down-turned, down-turned with flat
 * brows, flat, up-turned, up-turned and open. The brows on `Angry` are what
 * separate it from `Frown`, which is the closest pair in the set.
 *
 * **They are drawn at 32px, not 16.** That closest pair is exactly the caution
 * a face ramp has to answer: in a single tone at 16px a down-turned mouth and
 * a flat one are the same two pixels, and the whole set collapses into "five
 * circles". At 32px the stroke is ~2.7px and each mouth is a distinct arc, so
 * the five hold up as silhouettes — which is the only channel left once hue is
 * gone (§14). The calendar's marks draw the same faces at 20px inside a 36px
 * disc for the same reason. Neither carries the meaning alone: the numeral
 * 1–5 sits under every face and the word ("Fair", "Tạm ổn") is printed live
 * beside the group.
 *
 * Lucide, never an emoji (§14) — and an emoji is the obvious wrong answer to
 * "put a face here". An emoji is a font the OS chooses: it arrives
 * pre-coloured, at a size and weight nothing here controls, and it renders as
 * a different picture on every platform. These inherit `currentColor`, which
 * is what lets the chosen one invert with its button.
 *
 * Exported because the month calendar draws the same glyph inside each night's
 * mark. That is the point of a ramp: the picture the reader chose on the 9th
 * is the picture they see on the 9th when they look at the month, and two
 * tables mapping 1–5 to icons would be one table and a future disagreement.
 */
export const SLEEP_QUALITY_ICON: Record<number, LucideIcon> = {
  1: Angry,
  2: Frown,
  3: Meh,
  4: Smile,
  5: Laugh,
};

/**
 * How the night felt, 1–5 — one question, one row of large answers.
 *
 * Three things the five identical squares did not do. It NAMES the level in
 * words beside the group ("Fair", "Tạm ổn") so the number is not the only clue
 * what a 3 means; it RAMPS, through the icon set above, so the control reads
 * poor→great at rest; and it gives the selection a real state.
 *
 * That state is an INVERSION, not a tint. On this palette every token is 0%
 * saturation (§14), so a tinted fill of the kind a branded app would use lands
 * within a few percent of the unselected surface and is not a state at all.
 * The chosen button flips to `bg-primary` with `text-primary-foreground` — the
 * icon and the numeral invert with it because they inherit `currentColor` —
 * and the word above changes. Three cues, none of them a hue, on top of
 * `aria-pressed`.
 *
 * The numeral stays under the icon. The pictures are an ordering the reader
 * has to infer; the digits are the ordering stated, and they are what makes
 * "is a smile better than a flat mouth?" a question nobody has to answer.
 *
 * Toggle buttons rather than a radio group, and `role="group"` rather than
 * `radiogroup`, because quality is OPTIONAL and clearable: tapping the current
 * value returns to "not answered", which a radio group has no gesture for.
 * Each button carries its own `aria-pressed` and its own label, so the pressed
 * state is announced without relying on the icons.
 *
 * 72px targets in a 5-up grid with an 8px gap — comfortably past the 44px
 * minimum, and the reason this is a grid rather than a row of chips that could
 * wrap mid-scale. 72 rather than the old 64 because the faces grew to 32px and
 * the numeral still has to sit under them without crowding.
 *
 * **In a card, like everything else in the column.** This used to float
 * directly on the page between the times card and the details card, which made
 * one question in a stack of five look like a caption that had come loose. The
 * unselected buttons therefore need a fill that separates from the card they
 * now sit on — `bg-muted/50` plus the hairline border — where before they
 * could simply be `bg-card` against the page.
 */
export function SleepQualityScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const t = useTranslations('dashboard.health');

  // Literal keys, one per level. next-intl's generated declarations only
  // type-check literals, so `t(`sleep.qualityLevel${n}`)` would type-check
  // against nothing and happily ship a key that does not exist — the same
  // reason the factor labels are spelled out.
  const levelLabels: Record<number, string> = {
    1: t('sleep.qualityLevel1'),
    2: t('sleep.qualityLevel2'),
    3: t('sleep.qualityLevel3'),
    4: t('sleep.qualityLevel4'),
    5: t('sleep.qualityLevel5'),
  };

  return (
    <div className="space-y-4 rounded-3xl border bg-card p-5 shadow">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{t('sleep.quality')}</span>
        {/* The word, live. It is the half of this control that survives with
            no colour and no shape — and it is what makes "4" mean something
            on a screen the author is reading half awake. */}
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
        className="grid grid-cols-5 gap-2"
      >
        {LEVELS.map((level) => {
          const isActive = value === level;
          const Icon = SLEEP_QUALITY_ICON[level];

          return (
            <button
              key={level}
              type="button"
              aria-pressed={isActive}
              aria-label={
                isActive
                  ? t('sleep.qualityClear')
                  : `${t('sleep.qualityValue', { value: level })} — ${
                      levelLabels[level]
                    }`
              }
              // Tapping the current value clears it. Quality is optional and
              // never blocks a save, so there has to be a way back to "not
              // answered" once a stray tap has answered it.
              onClick={() => onChange(isActive ? null : level)}
              className={cn(
                'flex h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border',
                'transition-[background-color,border-color,color,transform] duration-200 ease-out motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                // The same press the calendar's day cells use — a plate change
                // is invisible under the fingertip making it, so the shrink is
                // the half of the press a phone can perceive.
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
