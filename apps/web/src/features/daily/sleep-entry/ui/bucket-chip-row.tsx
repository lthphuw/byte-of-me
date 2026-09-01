'use client';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

/**
 * One estimate, as a row of chips. Selection INVERTS rather than tints (§14),
 * and retap clears: these figures are optional, and absent is a different
 * claim from zero.
 *
 * It takes an ID and hands one back; what the id MEANS is the caller's — a
 * midpoint for the minute rows, the stored value for naps. Displaying one
 * rewrites nothing, so a pre-chip row keeps its exact minute.
 */
export function BucketChipRow({
  id,
  label,
  icon: Icon,
  options,
  optionLabels,
  clearLabel,
  activeId,
  onSelect,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Ids in display order. Four or five; nothing else has a row class. */
  options: readonly { id: string }[];
  /** By option id. Spelled out by the caller: next-intl's declarations only
   *  type-check literal keys. */
  optionLabels: Record<string, string>;
  clearLabel: string;
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <span
        id={id}
        className="flex items-center gap-1.5 text-sm font-medium"
      >
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        {label}
      </span>

      {/* One row, always — a scale that wraps stops reading as a scale. Both
          rows are literal classes because Tailwind cannot see a computed one. */}
      <div
        role="group"
        aria-labelledby={id}
        className={cn(
          'grid gap-2',
          options.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
        )}
      >
        {options.map((option) => {
          const isActive = option.id === activeId;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              aria-label={isActive ? clearLabel : undefined}
              onClick={() => onSelect(isActive ? null : option.id)}
              className={cn(
                'flex min-h-11 items-center justify-center rounded-2xl border px-1 text-center',
                'text-xs tabular-nums leading-tight',
                'transition-colors duration-200 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                isActive
                  ? 'border-primary bg-primary font-medium text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground'
              )}
            >
              {optionLabels[option.id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
