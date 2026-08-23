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
 *
 * The card is deliberately the roomiest thing on the screen: a 24px radius,
 * 32px of padding and one 176px ring with nothing beside it. That is the
 * "one question, one big answer" shape the rest of this module now follows,
 * and it is the only element here allowed to take a whole screen's width for
 * a single figure.
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
  const t = useTranslations('dashboard.daily');

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
    <div className="rounded-3xl border bg-card p-8 shadow">
      <div className="flex flex-col items-center gap-5">
        <DurationRing fraction={fraction} className="size-44">
          <span className="text-xs font-medium text-muted-foreground">
            {label ?? t('sleep.duration')}
          </span>
          {/* `text-3xl` and not larger, even though the card around it grew.
              The figure is a TRANSLATED string: `8h 10m` in `en` is
              `8 giờ 10 phút` in `vi`, three times the width, and it has to
              wrap inside the ring's ~150px inner diameter rather than spill
              over the arc. The ring gained the room instead — 176px, up from
              160 — which buys the longer string a line it did not have. */}
          <span
            aria-live="polite"
            className="text-3xl font-semibold tabular-nums leading-tight"
          >
            {durationMin === null
              ? '—'
              : t('units.hoursMinutes', splitMinutes(durationMin))}
          </span>
        </DurationRing>

        {/* The delta first, the target under it. The delta is the answer —
            "50m short of target" — and the target is the reference it was
            measured against; printing the reference first made the reader
            scan past a number they did not ask for to reach the one they
            did. */}
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
