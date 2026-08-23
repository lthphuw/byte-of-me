import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { ExerciseProgression } from '@/entities/gym-stats';

/** Below this the slope is drawn as flat rather than as a direction. A tenth
 *  of a kilo per session is a fortnight to move half a plate — inside the
 *  day-to-day noise the regression's own minimum exists to guard against, and
 *  an arrow pointing at it would claim a direction the number does not have. */
const FLAT_KG_PER_SESSION = 0.1;

/**
 * The progressive-overload slope, or the specific reason there is not one.
 *
 * A server component, because every branch of it is text and an icon and
 * nothing here is interactive. Shared by the statistics summary and the
 * per-exercise screen so the two cannot disagree about what a null means —
 * they were the first two places that would have written the sentence twice.
 *
 * **The direction is carried by an icon AND the sign of the number**, never by
 * a colour: this palette is achromatic on purpose, so a green-up/red-down
 * convention would be two identical greys. Near-zero renders as flat with a
 * dash rather than as a very small arrow.
 *
 * The null copy names the threshold and the count, because
 * `overloadSlopeKgPerSession` refuses below `OVERLOAD_MIN_SESSIONS`: two
 * points are a difference, not a trend, and three give an r² indistinguishable
 * from noise. "Needs 4 sessions with a reliable estimate, 2 so far" tells the
 * reader what to do; "no trend" reads as a finding about their training.
 */
export async function OverloadTrend({
  progression,
}: {
  progression: ExerciseProgression;
}) {
  const t = await getTranslations('dashboard.health.stats');

  const slope = progression.slopeKgPerSession;

  if (slope === null) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('slopeUnavailable', {
          min: progression.minSlopeSessions,
          n: progression.slopeSessions,
        })}
      </p>
    );
  }

  const flat = Math.abs(slope) < FLAT_KG_PER_SESSION;
  const Icon = flat ? Minus : slope > 0 ? TrendingUp : TrendingDown;

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span className="tabular-nums">
        {flat
          ? t('slopeFlat', { n: progression.slopeSessions })
          : t('slopeValue', {
              value: Math.round(slope * 10) / 10,
              n: progression.slopeSessions,
            })}
      </span>
    </p>
  );
}
