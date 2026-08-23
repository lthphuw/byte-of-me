'use client';

import { useEffect, useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { Delete } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { stepValue } from '@/features/health/workout-session/lib/set-increments';
import { cn } from '@/shared/lib/utils';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

/** Enough for `9999.99`, the largest weight the `Decimal(6,2)` column holds.
 *  A cap here rather than a validation message: a field that silently stops
 *  accepting digits is a smaller surprise mid-set than a rejected save. */
const MAX_LENGTH = 7;

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

/**
 * A number pad, hand-rolled, for the jumps the steppers are the wrong tool
 * for.
 *
 * **The OS keyboard is what this exists to avoid.** On a phone it covers
 * roughly half the screen, and — because it is the browser's own chrome, not
 * part of the layout — it displaces the sticky bar that carries the primary
 * action. The reader taps a weight, the keyboard comes up, the button they
 * were about to press is somewhere under it. Ten digits and a decimal point is
 * a two-hour build; getting a full keyboard out of the way is not solvable at
 * all from inside the page.
 *
 * It opens from the NUMBER, not from a separate button: the steppers handle
 * ±2.5 kg and this handles "the bar was at 60, now it is at 100". Tapping the
 * figure itself is the affordance, so the control stays three targets wide
 * instead of four.
 *
 * Keys are 64px in a 3-up grid with an 8px gap — past the 44×44 minimum in
 * both directions, and sized for a thumb rather than a fingertip because this
 * is used one-handed while holding something.
 *
 * Clearing to empty is deliberate and is not the same as zero. Every measure
 * here is nullable, and "no RPE recorded" is a different claim from "an RPE of
 * 0" — only the second belongs in a training load
 * (`shared/lib/number-field.ts`).
 */
export function NumpadSheet({
  open,
  onOpenChange,
  label,
  unit,
  initial,
  min,
  max,
  allowDecimal,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The measure being entered — the sheet's title, and what the buttons are
   *  labelled against for a screen reader. */
  label: string;
  /** kg, reps, seconds. Printed beside the entry so the figure is never a
   *  bare number the reader has to remember the unit of. */
  unit: string;
  initial: string;
  min: number;
  max: number;
  /** Weight takes a decimal point; reps and seconds are counted. */
  allowDecimal: boolean;
  onSubmit: (value: string) => void;
}) {
  const t = useTranslations('dashboard.health.workout.live');
  const [entry, setEntry] = useState(initial);

  // Re-seeded when the sheet OPENS, not on every render: continuous re-seeding
  // would throw away a keystroke, and reopening on another measure would
  // otherwise show the last one's digits.
  useEffect(() => {
    if (open) setEntry(initial);
  }, [open, initial]);

  const append = (digit: string) => {
    setEntry((current) => {
      if (digit === '.') {
        if (!allowDecimal || current.includes('.')) return current;
        return current === '' ? '0.' : `${current}.`;
      }

      // A leading zero is never meaningful and is how `05` reaches the schema.
      const next = current === '0' ? digit : `${current}${digit}`;

      return next.length > MAX_LENGTH ? current : next;
    });
  };

  const submit = () => {
    // An empty pad means "not recorded", which is a real answer here and must
    // not be clamped up to `min`. Everything else goes through `stepValue`
    // with no step, which is where clamping and the two-decimal rounding the
    // weight column needs already live.
    onSubmit(entry.trim() === '' ? '' : stepValue(entry, 0, { min, max }));
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={label}
      description={t('numpadHint')}
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEntry('')}
            className="h-14 flex-1 rounded-2xl"
          >
            {t('numpadClear')}
          </Button>
          <Button
            type="button"
            onClick={submit}
            className="h-14 flex-[2] rounded-2xl text-base"
          >
            {t('numpadApply')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* The entry, at display size. `aria-live` because the keys are the
            only way to change it and a screen reader would otherwise announce
            a button press with no result. */}
        <p
          aria-live="polite"
          className="flex min-h-16 items-baseline justify-end gap-2 rounded-2xl border bg-muted/40 px-5 py-3"
        >
          <span className="text-4xl font-semibold tabular-nums">
            {entry === '' ? '—' : entry}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </p>

        <div className="grid grid-cols-3 gap-2">
          {ROWS.flat().map((digit) => (
            <NumpadKey key={digit} onPress={() => append(digit)}>
              {digit}
            </NumpadKey>
          ))}

          <NumpadKey
            onPress={() => append('.')}
            disabled={!allowDecimal}
            label={t('numpadDecimal')}
          >
            .
          </NumpadKey>

          <NumpadKey onPress={() => append('0')}>0</NumpadKey>

          <NumpadKey
            onPress={() => setEntry((current) => current.slice(0, -1))}
            label={t('numpadBackspace')}
          >
            <Delete aria-hidden className="size-6" />
          </NumpadKey>
        </div>
      </div>
    </ResponsiveModal>
  );
}

function NumpadKey({
  children,
  onPress,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  /** For the two keys whose glyph is not their name. A digit needs none — its
   *  text content already reads correctly. */
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'flex h-16 items-center justify-center rounded-2xl border bg-card text-2xl font-medium tabular-nums',
        'transition-colors duration-200 hover:border-primary/40 hover:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-40'
      )}
    >
      {children}
    </button>
  );
}
