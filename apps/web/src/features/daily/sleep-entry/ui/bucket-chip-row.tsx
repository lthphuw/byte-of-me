'use client';

import type { LucideIcon } from 'lucide-react';

import type { SleepBucket } from '@/features/daily/sleep-entry/lib/sleep-buckets';
import { bucketIdOf } from '@/features/daily/sleep-entry/lib/sleep-buckets';
import { cn } from '@/shared/lib/utils';

/**
 * One estimate, as a row of chips.
 *
 * Selection INVERTS rather than tints — on a 0%-saturation palette (§14) a
 * tinted fill lands within a few percent of the unselected surface and is not
 * a state at all. Retap clears, the same gesture the quality scale documents:
 * both figures are optional, and their absence is a different claim from zero.
 *
 * A tap stores the bucket's midpoint. Displaying one never rewrites anything,
 * so a row typed before the chips existed keeps its exact minute unless the
 * reader actually answers again.
 */
export function BucketChipRow({
  id,
  label,
  icon: Icon,
  buckets,
  optionLabels,
  clearLabel,
  value,
  onChange,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  buckets: readonly SleepBucket[];
  /** By bucket id. Spelled out by the caller: next-intl's declarations only
   *  type-check literal keys. */
  optionLabels: Record<string, string>;
  clearLabel: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const activeId = bucketIdOf(value, buckets);

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
          buckets.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
        )}
      >
        {buckets.map((bucket) => {
          const isActive = bucket.id === activeId;

          return (
            <button
              key={bucket.id}
              type="button"
              aria-pressed={isActive}
              aria-label={isActive ? clearLabel : undefined}
              onClick={() => onChange(isActive ? null : bucket.value)}
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
              {optionLabels[bucket.id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
