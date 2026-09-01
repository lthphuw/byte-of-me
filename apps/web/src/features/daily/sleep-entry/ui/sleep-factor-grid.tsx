'use client';

import {
  Coffee,
  Dumbbell,
  ListChecks,
  type LucideIcon,
  Smartphone,
  Thermometer,
  Utensils,
  Wine,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SLEEP_FACTORS, type SleepFactor } from '@/entities/sleep-log';
import { cn } from '@/shared/lib/utils';

/** One picture per factor, and a literal one — a tile whose picture disagrees
 *  with its label costs a second read every morning. Lucide, never an emoji
 *  (§14): these inherit `currentColor` so they invert with the tile. */
const FACTOR_ICON: Record<SleepFactor, LucideIcon> = {
  caffeine_late: Coffee,
  alcohol: Wine,
  screen_late: Smartphone,
  late_meal: Utensils,
  workout_late: Dumbbell,
  ill: Thermometer,
};

/**
 * What was in the way last night, as a fixed 3-up grid of icon tiles. Wrapping
 * text chips broke 4/2 in `en` and 3/3 in `vi`, and a control whose shape
 * depends on its string has no shape to remember.
 *
 * The label stays UNDER the icon, never replaced by it: a glass could be wine
 * or water, and nothing here carries a meaning alone. Selection INVERTS rather
 * than tints (§14), with `aria-pressed` for anyone not looking at the fill.
 *
 * 88px tall with an 8px gap — past the 44px minimum both ways, and tall
 * enough for a two-line Vietnamese label.
 */
export function SleepFactorGrid({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (factor: SleepFactor) => void;
}) {
  const t = useTranslations('dashboard.daily');

  // Literal keys: next-intl's generated declarations only type-check
  // literals, so an interpolated key checks against nothing and ships a key
  // that may not exist. `use-space-nav-items.ts` spells its labels out too.
  const factorLabels: Record<SleepFactor, string> = {
    caffeine_late: t('factors.caffeine_late'),
    alcohol: t('factors.alcohol'),
    screen_late: t('factors.screen_late'),
    late_meal: t('factors.late_meal'),
    workout_late: t('factors.workout_late'),
    ill: t('factors.ill'),
  };

  return (
    <div className="space-y-3">
      {/* Toggle buttons say nothing about being multi-select the way a
          checkbox would. `aria-pressed` covers the reader; this covers the
          rest. */}
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <ListChecks
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        {t('sleep.factors')}
      </span>

      <div
        role="group"
        aria-label={t('sleep.factors')}
        className="grid grid-cols-3 gap-2"
      >
        {SLEEP_FACTORS.map((factor) => {
          const isActive = selected.includes(factor);
          const Icon = FACTOR_ICON[factor];

          return (
            <button
              key={factor}
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggle(factor)}
              className={cn(
                'flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3',
                'transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              <span
                className={cn(
                  'break-safe text-center text-[11px] leading-tight',
                  isActive ? 'font-medium' : ''
                )}
              >
                {factorLabels[factor]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
