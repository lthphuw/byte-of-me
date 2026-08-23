'use client';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

export interface TileOption {
  value: string;
  label: string;
  /** Lucide only, never an emoji (§14): it has to inherit `currentColor` so
   *  it inverts with the tile it sits on. */
  icon?: LucideIcon;
}

/**
 * A question answered by tapping one of a grid of rounded tiles.
 *
 * Extracted rather than written per screen: the gym surface asks this shape of
 * question seven times — primary muscle, secondary muscles, equipment, what a
 * set records, which muscle to filter by, which routine to start from, session
 * RPE — and `SleepFactorGrid` and `SleepQualityScale` had already answered it
 * twice on the sleep side. Nine hand-written copies of the same fill/border/
 * focus/target rules is how two of them end up disagreeing about what
 * "selected" looks like.
 *
 * **Selection INVERTS, it does not tint.** Every token in this palette is 0%
 * saturation (§14), so the tinted fill a branded app would use lands within a
 * few percent of the unselected surface and is not a state at all. The chosen
 * tile flips to `bg-primary` / `text-primary-foreground`, its label goes
 * semibold, and `aria-pressed` carries the same fact for anyone not looking at
 * the fill. Three cues, none of them a hue.
 *
 * **Toggle buttons, not a radio group**, and `role="group"` rather than
 * `radiogroup`, for the reason `SleepQualityScale` documents: these answers
 * are optional and clearable, and a radio group has no gesture for returning
 * to "not answered". Single-select callers decide for themselves whether a
 * second tap clears — `onToggle` gets the value and nothing else.
 *
 * Tiles are at least 56px tall with an 8px gap, past the 44×44 minimum in both
 * directions and tall enough for a two-line Vietnamese label.
 */
export function OptionTileGrid({
  options,
  selected,
  onToggle,
  ariaLabel,
  columns = 'grid-cols-3',
  disabled = false,
  className,
}: {
  options: readonly TileOption[];
  /** The values currently chosen. A single-select caller passes one or none. */
  selected: readonly string[];
  onToggle: (value: string) => void;
  ariaLabel: string;
  /** Tailwind grid-column classes, so each question can pick a shape that
   *  fits its longest label rather than inheriting one. */
  columns?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('grid gap-2', columns, className)}
    >
      {options.map((option) => {
        const isActive = selected.includes(option.value);
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onToggle(option.value)}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isActive
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground'
            )}
          >
            {Icon ? <Icon aria-hidden className="size-5 shrink-0" /> : null}
            <span
              className={cn(
                'break-safe text-center text-xs leading-tight',
                isActive ? 'font-semibold' : 'font-medium'
              )}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The heading a tile grid answers to, with the live answer beside it.
 *
 * The word on the right is the half of one of these controls that survives
 * with no colour and no shape — `SleepQualityScale` puts it there for exactly
 * that reason, and it is `aria-live` so a change is announced rather than only
 * drawn.
 */
export function FieldHeading({
  label,
  answer,
  answered,
}: {
  label: string;
  answer: string;
  /** Whether `answer` is a real answer or the "not chosen yet" placeholder. */
  answered: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <span
        aria-live="polite"
        className={cn(
          'break-safe min-w-0 text-right text-sm',
          answered ? 'font-medium text-foreground' : 'text-muted-foreground'
        )}
      >
        {answer}
      </span>
    </div>
  );
}
