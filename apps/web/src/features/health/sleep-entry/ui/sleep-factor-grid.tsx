'use client';

import {
  Coffee,
  Dumbbell,
  type LucideIcon,
  Smartphone,
  Thermometer,
  Utensils,
  Wine,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SLEEP_FACTORS, type SleepFactor } from '@/entities/sleep-log';
import { cn } from '@/shared/lib/utils';

/**
 * One picture per factor.
 *
 * Literal objects, never a cup for "late meal": the icon is the thing the eye
 * lands on first in a grid, and a tile whose picture disagrees with its label
 * costs a second read every morning. Lucide, never an emoji (§14) — these have
 * to inherit `currentColor` so they invert with the tile.
 */
const FACTOR_ICON: Record<SleepFactor, LucideIcon> = {
  caffeine_late: Coffee,
  alcohol: Wine,
  screen_late: Smartphone,
  late_meal: Utensils,
  workout_late: Dumbbell,
  ill: Thermometer,
};

/**
 * What was in the way last night, as a grid of rounded icon tiles.
 *
 * This was a wrapping row of text chips. Six chips of unequal width wrapped
 * differently in each locale — Vietnamese runs longer, so `en` broke 4/2 and
 * `vi` broke 3/3 — and a control whose shape depends on the string in it has
 * no shape to remember. A fixed 3-up grid of equal tiles is the same picture
 * in both locales, and it is the multi-select form the reference uses for
 * exactly this kind of "which of these applied?" question.
 *
 * The icon is not decoration: it is what makes a tile identifiable before the
 * label is read, which is the whole reason the grid is faster than the chips
 * it replaced. The label stays UNDER it rather than being replaced by it —
 * a picture of a glass could be wine or water, and the module's rule is that
 * nothing carries a meaning on its own.
 *
 * Selection INVERTS rather than tints, the same decision the quality scale
 * documents: on a 0%-saturation palette (§14) a tinted fill lands within a few
 * percent of the unselected surface and is not a state at all. `aria-pressed`
 * carries it for anyone not looking at the fill.
 *
 * 88px tall in a 3-up grid with an 8px gap: past the 44px minimum in both
 * directions, and tall enough for a two-line Vietnamese label.
 */
export function SleepFactorGrid({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (factor: SleepFactor) => void;
}) {
  const t = useTranslations('dashboard.health');

  // Literal keys, one per factor. next-intl's generated declarations only
  // type-check literals, so a `t(`factors.${code}`)` in the map below would
  // type-check against nothing and happily ship a key that does not exist —
  // the same reason `use-space-nav-items.ts` spells its labels out.
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
      <span className="text-sm font-medium">{t('sleep.factors')}</span>

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
