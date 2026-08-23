'use client';

import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@byte-of-me/ui';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { labelForCode, useGymLabels } from '@/shared/hooks/use-gym-labels';
import { cn } from '@/shared/lib/utils';
import { OptionTileGrid } from '@/shared/ui/option-tile-grid';

/**
 * Which muscle the catalogue is showing, behind one tap.
 *
 * Eighteen tiles (seventeen muscles and "all") is six rows on a phone — over
 * 300px of filter above the first exercise, on a screen whose job is to show
 * exercises. Closed by default, with the current choice printed on the
 * trigger, it costs one tap and gives the list the screen back. That is the
 * same trade `SleepDetailsSection` makes, and it is a `Collapsible` at every
 * width rather than a sheet on a phone: this is a filter on the list right
 * below it, not a detour off the flow, so expanding in place keeps the two
 * connected.
 *
 * The trigger STATES the current filter rather than only marking it in the
 * grid, because the grid is closed most of the time and a filtered list with
 * no visible reason for being short is the worst state this screen has.
 *
 * `''` is "all muscles" — the same empty-string convention the query key uses,
 * so the control, the key and the action all agree on one representation of
 * "no filter".
 */
export function MuscleFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (muscle: string) => void;
}) {
  const t = useTranslations('dashboard.gym.exercises');
  const labels = useGymLabels();
  const [open, setOpen] = useState(false);

  const current =
    value === '' ? t('allMuscles') : labelForCode(labels.muscle, value);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-11 w-full items-center gap-2 rounded-2xl border bg-card px-4 text-left',
            'transition-colors duration-200 hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          )}
        >
          <SlidersHorizontal
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="text-sm text-muted-foreground">
            {t('filterAriaLabel')}
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-sm font-medium">
            {current}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
              open && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3">
          <OptionTileGrid
            ariaLabel={t('filterAriaLabel')}
            columns="grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
            options={[
              { value: '', label: t('allMuscles') },
              ...labels.muscles.map((code) => ({
                value: code,
                label: labels.muscle[code],
              })),
            ]}
            selected={[value]}
            // Tapping the chosen muscle again returns to "all" — the same
            // clear-by-retap gesture the quality scale uses, and the only way
            // back that does not require finding the "All" tile again.
            onToggle={(next) => onChange(next === value ? '' : next)}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
