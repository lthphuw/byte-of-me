'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { stepValue } from '@/features/gym/workout-session/lib/set-increments';
import { cn } from '@/shared/lib/utils';

/**
 * The hold before a press starts repeating, and the ramp it accelerates down.
 *
 * 450ms is long enough that a normal tap — which is the common case, one plate
 * up — never trips it, and short enough that a deliberate hold does not feel
 * stuck. The ramp exists because the distance a stepper has to cover is not
 * uniform: 60 kg to 62.5 is one press, but an empty field to 100 kg is forty,
 * and at a fixed rate that is nine seconds of holding. Accelerating turns it
 * into about two.
 */
const HOLD_MS = 450;
const REPEAT_STEPS_MS = [200, 200, 200, 120, 120, 120, 70, 70, 40] as const;

export interface StepperBounds {
  min: number;
  max: number;
}

/**
 * One measure, entered without the OS keyboard.
 *
 * Three targets: `−`, the number, `+`. The two steppers are 56px squares
 * stepping by the smallest increment that exercise's equipment actually comes
 * in (`set-increments.ts`), and they repeat when held, accelerating, so a big
 * change is a hold rather than forty taps. The NUMBER is the third target and
 * opens the numpad — a jump from 60 to 100 is one gesture there and sixteen
 * presses here.
 *
 * **No `<input type="number">` anywhere in this control**, which is the point
 * of the whole thing: focusing one on a phone summons the OS keyboard, and the
 * OS keyboard covers half the screen and displaces the sticky bar carrying the
 * primary action. The value is rendered as text and only ever changes through
 * these three controls.
 *
 * `touch-none` on the steppers, so a hold that drifts a few pixels keeps
 * repeating instead of being taken over as a page scroll — the one gesture
 * that must not be reinterpreted is the one being held on purpose.
 *
 * An unset measure prints an em dash rather than a zero, because those are
 * different claims: a set with no RPE must not enter a training load as a zero
 * (`shared/lib/number-field.ts`).
 */
export function NumberStepper({
  label,
  unit,
  value,
  step,
  bounds,
  onChange,
  onOpenNumpad,
}: {
  label: string;
  unit: string;
  value: string;
  step: number;
  bounds: StepperBounds;
  onChange: (value: string) => void;
  onOpenNumpad: () => void;
}) {
  const t = useTranslations('dashboard.health.workout.live');

  // Read inside the repeat rather than closed over: a hold spans dozens of
  // updates, and a callback capturing the value it started with would step
  // from that same number every time and never move past one increment.
  const valueRef = useRef(value);
  valueRef.current = value;

  const apply = useCallback(
    (delta: number) => onChange(stepValue(valueRef.current, delta, bounds)),
    [bounds, onChange]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>

      <div className="flex items-stretch gap-2">
        <StepButton
          ariaLabel={t('decrease', { label })}
          icon={Minus}
          onStep={() => apply(-step)}
        />

        <button
          type="button"
          onClick={onOpenNumpad}
          aria-label={t('editValue', { label })}
          className={cn(
            'flex min-w-0 flex-1 items-center justify-center rounded-2xl border bg-card px-2',
            'h-16 text-3xl font-semibold tabular-nums',
            'transition-colors duration-200 hover:border-primary/40 hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          )}
        >
          <span className="truncate">{value === '' ? '—' : value}</span>
        </button>

        <StepButton
          ariaLabel={t('increase', { label })}
          icon={Plus}
          onStep={() => apply(step)}
        />
      </div>
    </div>
  );
}

/**
 * A stepper button: one press per tap, and an accelerating repeat while held.
 *
 * The repeat is a chain of `setTimeout`s rather than a `setInterval`, because
 * the delay changes as it goes and an interval cannot be re-timed without
 * being torn down and rebuilt on every step.
 *
 * `didRepeat` is what stops a hold also firing a click when the finger lifts:
 * the tap path is `onClick`, the hold path is the chain, and without the flag
 * a hold would apply one extra increment at the end.
 *
 * Pointer capture keeps the hold alive when the thumb slides off a 56px button
 * mid-press — likely, since the whole point is that the reader is not looking
 * at the screen. Wrapped, because a browser without the method throws rather
 * than ignoring it.
 */
function StepButton({
  ariaLabel,
  icon: Icon,
  onStep,
}: {
  ariaLabel: string;
  icon: typeof Minus;
  onStep: () => void;
}) {
  const timer = useRef<number | null>(null);
  const repeatCount = useRef(0);
  const didRepeat = useRef(false);

  // Same reason `valueRef` exists above: the chain below outlives the render
  // that scheduled it, so it must not call whichever `onStep` was current when
  // the finger went down.
  const stepRef = useRef(onStep);
  stepRef.current = onStep;

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    repeatCount.current = 0;
  }, []);

  const scheduleNext = useCallback(() => {
    const index = Math.min(repeatCount.current, REPEAT_STEPS_MS.length - 1);
    const delay = REPEAT_STEPS_MS[index] ?? 40;

    timer.current = window.setTimeout(() => {
      didRepeat.current = true;
      repeatCount.current += 1;
      stepRef.current();
      scheduleNext();
    }, delay);
  }, []);

  // A component unmounted mid-hold — the exercise switched, the session
  // finished — must not leave a timer stepping a value nothing renders.
  useEffect(() => cancel, [cancel]);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={(event) => {
        didRepeat.current = false;
        repeatCount.current = 0;

        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Not every engine implements capture for every pointer type.
        }

        timer.current = window.setTimeout(() => {
          didRepeat.current = true;
          stepRef.current();
          scheduleNext();
        }, HOLD_MS);
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onClick={() => {
        if (didRepeat.current) {
          didRepeat.current = false;
          return;
        }
        stepRef.current();
      }}
      className={cn(
        'flex size-14 shrink-0 touch-none items-center justify-center rounded-2xl border bg-card',
        'transition-colors duration-200 hover:border-primary/40 hover:bg-muted active:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      <Icon aria-hidden className="size-6" />
    </button>
  );
}
