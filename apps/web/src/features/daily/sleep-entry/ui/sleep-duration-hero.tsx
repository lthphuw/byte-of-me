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
 * The night's length, as an arc with the figure spelled out beside it.
 *
 * The arc is decoration over the text, never instead of it — `aria-live` is on
 * the figure and on the delta, and both say in words what the ring says in
 * geometry.
 *
 * Two sizes. The daily screen takes the roomy one, where last night's length
 * is the point of the column it sits in. The day sheet takes `compact`: there
 * the figure is a consequence of the two clocks above it, and at full size it
 * was 348px of card between the top of the sheet and the fields the sheet
 * exists to fill.
 */
export function SleepDurationHero({
  durationMin,
  targetMin,
  label,
  emptyLabel,
  footnote,
  compact,
}: {
  durationMin: number | null;
  /** The owner's nightly goal. Absent when the summary read failed. */
  targetMin?: number;
  /** What the figure is. Defaults to "Duration" — the daily screen overrides
   *  it with "Last night", because there the number is a record rather than a
   *  live total. */
  label?: string;
  /** What to say instead of the delta when there is no duration at all. */
  emptyLabel?: string;
  /** One more line under the delta — the daily screen's "Estimated" caveat. */
  footnote?: string;
  /** A row rather than a column, at a third of the height. */
  compact?: boolean;
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
  // 6am. Compact says nothing while the clocks are empty — the field above it
  // is already printing the reason.
  let deltaLabel = '';
  if (durationMin === null) {
    deltaLabel = compact ? '' : (emptyLabel ?? t('sleep.durationPending'));
  } else if (deltaMin !== null) {
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

  if (compact) {
    return (
      <div className="flex items-center gap-4 rounded-3xl border bg-card p-4 shadow">
        <DurationRing fraction={fraction} className="size-16" />

        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground">
            {label ?? t('sleep.duration')}
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

  return (
    <div className="rounded-3xl border bg-card p-8 shadow">
      <div className="flex flex-col items-center gap-5">
        <DurationRing fraction={fraction} className="size-44">
          <span className="text-xs font-medium text-muted-foreground">
            {label ?? t('sleep.duration')}
          </span>
          {/* `text-3xl` and not larger, even though the card around it grew:
              `8h 10m` in `en` is `8 giờ 10 phút` in `vi`, three times the
              width, and it has to wrap inside the ring's ~150px inner
              diameter rather than spill over the arc. */}
          <span
            aria-live="polite"
            className="text-3xl font-semibold tabular-nums leading-tight"
          >
            {figure}
          </span>
        </DurationRing>

        {/* The delta first, the target under it: the delta is the answer, the
            target is only the reference it was measured against. */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p
            aria-live="polite"
            className="text-base font-medium tabular-nums text-foreground"
          >
            {deltaLabel}
          </p>

          {targetMin === undefined ? null : (
            <p className="text-xs tabular-nums text-muted-foreground">
              {t('sleep.nightlyTarget', splitMinutes(targetMin))}
            </p>
          )}

          {footnote ? (
            <p className="text-xs text-muted-foreground">{footnote}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
