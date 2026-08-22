'use client';

import { useTranslations } from 'next-intl';

import { splitMinutes } from '@/shared/lib/health/duration';
import { DurationRing } from '@/shared/ui/duration-ring';

/** With no target read from settings the ring still has to have a scale, and
 *  eight hours is the figure every public guideline lands on. The tile only
 *  PRINTS a target when one was actually read, so this is a drawing default
 *  and never a claim. */
const FALLBACK_TARGET_MIN = 480;

/**
 * The night's length, as the focal point of the screen.
 *
 * This replaces a caption. "Duration: 8h 10m" in muted 14px text was the
 * smallest thing on a screen whose entire purpose is that number, and it gave
 * the reader nothing to compare it against — a fortnight of 6h nights and a
 * fortnight of 8h nights rendered identically.
 *
 * So: the figure at display size in `tabular-nums` (so the digits do not
 * shuffle as the minutes change), inside an arc that fills toward the target,
 * with the shortfall or the surplus spelled out underneath. The arc is
 * decoration over the text, never instead of it — `aria-live` is on the figure
 * and the delta, and both say in words what the ring says in geometry.
 */
export function SleepDurationHero({
  durationMin,
  targetMin,
  label,
  emptyLabel,
  footnote,
}: {
  durationMin: number | null;
  /** The owner's nightly goal. Absent when the summary read failed. */
  targetMin?: number;
  /** What the figure is. Defaults to "Duration" — the hub overrides it with
   *  "Last night", because there the number is a record rather than a
   *  live total. */
  label?: string;
  /** What to say instead of the delta when there is no duration at all. The
   *  form is waiting for input; the hub simply has nothing logged, and those
   *  are different sentences. */
  emptyLabel?: string;
  /** One more line under the delta — the hub's "Estimated" caveat. */
  footnote?: string;
}) {
  const t = useTranslations('dashboard.health');

  const scale = targetMin ?? FALLBACK_TARGET_MIN;
  const fraction = durationMin === null ? 0 : durationMin / scale;
  const deltaMin =
    durationMin === null || targetMin === undefined
      ? null
      : durationMin - targetMin;

  // Three states rather than a signed number: a bare "-50" asks the reader to
  // remember what it is signed against, and the sign is exactly what gets
  // misread at 6am. Null delta is a different sentence from "on target" — it
  // means there is no target to compare against at all.
  let deltaLabel = '';
  if (durationMin === null) {
    deltaLabel = emptyLabel ?? t('sleep.durationPending');
  } else if (deltaMin !== null) {
    if (Math.abs(deltaMin) < 5) {
      deltaLabel = t('sleep.onTarget');
    } else if (deltaMin > 0) {
      deltaLabel = t('sleep.overTarget', splitMinutes(deltaMin));
    } else {
      deltaLabel = t('sleep.underTarget', splitMinutes(-deltaMin));
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow">
      <div className="flex flex-col items-center gap-3">
        <DurationRing fraction={fraction}>
          <span className="text-xs font-medium text-muted-foreground">
            {label ?? t('sleep.duration')}
          </span>
          <span
            aria-live="polite"
            className="text-3xl font-semibold tabular-nums leading-none"
          >
            {durationMin === null
              ? '—'
              : t('units.hoursMinutes', splitMinutes(durationMin))}
          </span>
        </DurationRing>

        <div className="flex flex-col items-center gap-1 text-center">
          {targetMin === undefined ? null : (
            <p className="text-xs tabular-nums text-muted-foreground">
              {t('sleep.nightlyTarget', splitMinutes(targetMin))}
            </p>
          )}

          <p
            aria-live="polite"
            className="text-sm font-medium tabular-nums text-foreground"
          >
            {deltaLabel}
          </p>

          {footnote ? (
            <p className="text-xs text-muted-foreground">{footnote}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
