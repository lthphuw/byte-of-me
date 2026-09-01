'use client';

import { useTranslations } from 'next-intl';

import { splitMinutes } from '@/shared/lib/health/duration';
import { DurationRing } from '@/shared/ui/duration-ring';

/** With no target read from settings the ring still needs a scale, and eight
 *  hours is where every public guideline lands. Never PRINTED, so it stays a
 *  drawing default rather than a claim about the owner's goal. */
const FALLBACK_TARGET_MIN = 480;

/**
 * The night's length, as an arc with the figure spelled out beside it.
 *
 * The arc is decoration over the text, never instead of it — `aria-live` is on
 * the figure and on the delta, and both say in words what the ring says in
 * geometry.
 */
export function SleepDurationHero({
  durationMin,
  targetMin,
}: {
  durationMin: number | null;
  /** The owner's nightly goal. Absent when the summary read failed. */
  targetMin?: number;
}) {
  const t = useTranslations('dashboard.daily');

  const scale = targetMin ?? FALLBACK_TARGET_MIN;
  const fraction = durationMin === null ? 0 : durationMin / scale;
  const deltaMin =
    durationMin === null || targetMin === undefined
      ? null
      : durationMin - targetMin;

  // Three states rather than a signed number: a bare "-50" asks the reader to
  // remember what it is signed against, and the sign is what gets misread at
  // 6am. Silent while the clocks are empty — the field above already says why.
  let deltaLabel = '';
  if (durationMin !== null && deltaMin !== null) {
    if (Math.abs(deltaMin) < 5) {
      deltaLabel = t('sleep.onTarget');
    } else if (deltaMin > 0) {
      deltaLabel = t('sleep.overTarget', splitMinutes(deltaMin));
    } else {
      deltaLabel = t('sleep.underTarget', splitMinutes(-deltaMin));
    }
  }

  const figure =
    durationMin === null
      ? '—'
      : t('units.hoursMinutes', splitMinutes(durationMin));

  return (
    <div className="flex items-center gap-4 rounded-3xl border bg-card p-4 shadow">
      <DurationRing fraction={fraction} className="size-16" />

      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t('sleep.duration')}
        </p>
        <p
          aria-live="polite"
          className="text-2xl font-semibold tabular-nums leading-tight"
        >
          {figure}
        </p>
        {deltaLabel === '' ? null : (
          <p
            aria-live="polite"
            className="text-xs tabular-nums text-muted-foreground"
          >
            {deltaLabel}
          </p>
        )}
      </div>
    </div>
  );
}
