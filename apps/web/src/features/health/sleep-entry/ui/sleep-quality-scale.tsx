'use client';

import {
  CloudDrizzle,
  CloudLightning,
  CloudMoon,
  type LucideIcon,
  Moon,
  MoonStar,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

const LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * The ramp, as a night sky clearing.
 *
 * Five identical squares said nothing about which end was bad, and the bar
 * chart that replaced them said "more" without saying more of WHAT. These say
 * it in one look: a storm, then drizzle, then a moon behind cloud, then a
 * clear moon, then a moon with stars out. The progression is monotone — each
 * step has strictly less weather in front of the moon than the one before —
 * so it reads left-to-right as poor→great before anything is selected, and it
 * reads that way in silhouette, which is the only channel left once hue is
 * gone.
 *
 * Lucide, never an emoji (§14). An emoji is a font the OS chooses: it arrives
 * pre-coloured, at a size and weight nothing here controls, and it renders as
 * a different picture on every platform. These inherit `currentColor`, which
 * is what lets the chosen one invert with its button.
 */
const LEVEL_ICON: Record<number, LucideIcon> = {
  1: CloudLightning,
  2: CloudDrizzle,
  3: CloudMoon,
  4: Moon,
  5: MoonStar,
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
 * "is a moon better than a cloudy moon?" a question nobody has to answer.
 *
 * Toggle buttons rather than a radio group, and `role="group"` rather than
 * `radiogroup`, because quality is OPTIONAL and clearable: tapping the current
 * value returns to "not answered", which a radio group has no gesture for.
 * Each button carries its own `aria-pressed` and its own label, so the pressed
 * state is announced without relying on the icons.
 *
 * 64px targets in a 5-up grid with an 8px gap — comfortably past the 44px
 * minimum, and the reason this is a grid rather than a row of chips that could
 * wrap mid-scale.
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
    <div className="space-y-3">
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
          const Icon = LEVEL_ICON[level];

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
                'flex h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border',
                'transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon aria-hidden className="size-6 shrink-0" />
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
