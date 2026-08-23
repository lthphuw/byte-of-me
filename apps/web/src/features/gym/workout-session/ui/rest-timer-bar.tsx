'use client';

import { Button } from '@byte-of-me/ui';
import { Plus, Timer, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatSeconds } from '@/features/gym/workout-session/lib/live-clock';
import type { RestTimer } from '@/features/gym/workout-session/model/use-rest-timer';
import { cn } from '@/shared/lib/utils';

/** What "+" adds. Half a minute is the unit a lifter thinks in — "give it
 *  another thirty seconds" — and two presses cover the usual overrun. */
const EXTEND_SEC = 30;

/**
 * The rest interval, above the primary action.
 *
 * It counts DOWN to zero and then keeps going UP, marked as over. A timer that
 * stops at 0:00 throws away the one number that decides whether the next set
 * is comparable to the last: "forty seconds late" is information, and a frozen
 * zero pretends the rest ended when the alarm did.
 *
 * **"Over" is an INVERSION, not a tint** (§14). Every token here is 0%
 * saturation, so a coloured fill lands within a few percent of the surface and
 * is not a state at all; the row flips to `bg-primary` with
 * `text-primary-foreground`, the icon and digits inverting with it because
 * they inherit `currentColor`. The word changes too, and an `aria-live` span
 * carries the same fact for anyone not looking — three channels, since the
 * fourth (a vibration) exists only on Android (`rest-cue.ts`).
 *
 * The live region holds the STATE, never the digits. A clock repainting twice
 * a second inside `aria-live` would have a screen reader announcing a number
 * continuously for two minutes.
 */
export function RestTimerBar({ timer }: { timer: RestTimer }) {
  const t = useTranslations('dashboard.gym.workout.live');

  if (!timer.isResting) return null;

  const overSec = -timer.remainingSec;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-2xl border px-3 py-2',
        'transition-colors duration-200',
        timer.isOver
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-card'
      )}
    >
      <Timer aria-hidden className="size-5 shrink-0" />

      <span className="text-xl font-semibold tabular-nums">
        {timer.isOver
          ? `+${formatSeconds(overSec)}`
          : formatSeconds(timer.remainingSec)}
      </span>

      <span
        className={cn(
          'min-w-0 flex-1 truncate text-xs',
          timer.isOver ? 'font-medium' : 'text-muted-foreground'
        )}
      >
        {timer.isOver ? t('restOver') : t('restRemaining')}
      </span>

      {/* The state, and only the state. */}
      <span className="sr-only" aria-live="polite">
        {timer.isOver ? t('restOver') : ''}
      </span>

      {/* Ghost with an explicit border rather than `outline`, whose
          `bg-background` would punch a hole in the inverted row. On that row
          both controls inherit `text-primary-foreground` and tint their hover
          from it, so the pair reads correctly in either theme without a token
          that only exists in one. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => timer.extend(EXTEND_SEC)}
        aria-label={t('restExtend', { seconds: EXTEND_SEC })}
        className={cn(
          'h-11 shrink-0 rounded-xl border px-3 tabular-nums',
          timer.isOver &&
            'border-primary-foreground/40 hover:bg-primary-foreground/15 hover:text-primary-foreground'
        )}
      >
        <Plus aria-hidden className="mr-1 size-4" />
        {t('restExtendShort', { seconds: EXTEND_SEC })}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={timer.stop}
        aria-label={t('restSkip')}
        className={cn(
          'size-11 shrink-0 rounded-xl',
          timer.isOver &&
            'hover:bg-primary-foreground/15 hover:text-primary-foreground'
        )}
      >
        <X aria-hidden className="size-4" />
      </Button>
    </div>
  );
}
