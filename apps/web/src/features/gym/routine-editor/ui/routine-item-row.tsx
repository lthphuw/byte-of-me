'use client';

import { useState } from 'react';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
} from '@byte-of-me/ui';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { RoutineItemDraft } from '@/features/gym/routine-editor/lib/routine-drafts';
import { labelForCode, useGymLabels } from '@/shared/hooks/use-gym-labels';
import { cn } from '@/shared/lib/utils';

/**
 * One planned exercise, its position, and the targets behind a disclosure.
 *
 * **Order is buttons, not drag.** A pointer drag is not a gesture a keyboard
 * or a screen reader has, and the accessible fallback for one is a pair of
 * buttons anyway — so the buttons are the whole implementation rather than a
 * second one to keep in step. They are 44px, and the first row's "up" and the
 * last row's "down" are disabled rather than silently doing nothing.
 *
 * **Five targets, all optional, all closed by default.** A routine is usable
 * with nothing but an order; sets, a rep range, an RPE and a rest interval are
 * refinements. Showing twenty-five inputs for a five-exercise plan is what
 * makes a plan feel like paperwork. The trigger prints the targets already
 * set, so a closed row still says what it is asking for.
 *
 * The summary is a row of separate chips rather than one composed sentence:
 * "3 sets", "8–12 reps" and "90s rest" each come from their own message with
 * their own `{n, number}`, because gluing translated fragments together in
 * code produces a sentence no translator ever saw.
 */
export function RoutineItemRow({
  item,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  item: RoutineItemDraft;
  index: number;
  total: number;
  onChange: (next: RoutineItemDraft) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('dashboard.gym.routines');
  const labels = useGymLabels();
  const [open, setOpen] = useState(false);

  const chips: string[] = [];
  if (item.targetSets.trim() !== '') {
    chips.push(t('summarySets', { n: Number(item.targetSets) }));
  }
  if (item.targetRepsLow.trim() !== '' && item.targetRepsHigh.trim() !== '') {
    chips.push(
      t('summaryReps', {
        low: Number(item.targetRepsLow),
        high: Number(item.targetRepsHigh),
      })
    );
  } else if (item.targetRepsLow.trim() !== '') {
    chips.push(t('summaryRepsExact', { n: Number(item.targetRepsLow) }));
  } else if (item.targetRepsHigh.trim() !== '') {
    chips.push(t('summaryRepsExact', { n: Number(item.targetRepsHigh) }));
  }
  if (item.targetRpe.trim() !== '') {
    chips.push(t('summaryRpe', { value: Number(item.targetRpe) }));
  }
  if (item.restSec.trim() !== '') {
    chips.push(t('summaryRest', { n: Number(item.restSec) }));
  }

  const fieldId = (field: string) => `routine-item-${item.key}-${field}`;

  return (
    <li className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums"
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="break-safe text-sm font-medium">{item.exerciseName}</p>
          <p className="text-xs text-muted-foreground">
            {labelForCode(labels.muscle, item.primaryMuscle)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-xl"
            disabled={index === 0}
            aria-label={t('moveUpNamed', { name: item.exerciseName })}
            onClick={() => onMove(-1)}
          >
            <ChevronUp aria-hidden className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-xl"
            disabled={index === total - 1}
            aria-label={t('moveDownNamed', { name: item.exerciseName })}
            onClick={() => onMove(1)}
          >
            <ChevronDown aria-hidden className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-xl"
            aria-label={t('removeNamed', { name: item.exerciseName })}
            onClick={onRemove}
          >
            <Trash2 aria-hidden className="size-4" />
          </Button>
        </div>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'mt-3 flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left',
              'transition-colors duration-200 hover:bg-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
          >
            <span className="text-xs font-medium">{t('targets')}</span>

            <span className="break-safe min-w-0 flex-1 text-right text-xs text-muted-foreground">
              {chips.length === 0 ? t('noTargets') : chips.join(' · ')}
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
          <div className="mt-3 grid grid-cols-2 gap-3">
            <TargetField
              id={fieldId('sets')}
              label={t('targetSets')}
              value={item.targetSets}
              min={1}
              max={20}
              onChange={(value) => onChange({ ...item, targetSets: value })}
            />
            <TargetField
              id={fieldId('rest')}
              label={t('restSec')}
              value={item.restSec}
              min={0}
              max={3600}
              onChange={(value) => onChange({ ...item, restSec: value })}
            />
            <TargetField
              id={fieldId('reps-low')}
              label={t('targetRepsLow')}
              value={item.targetRepsLow}
              min={1}
              max={200}
              onChange={(value) => onChange({ ...item, targetRepsLow: value })}
            />
            <TargetField
              id={fieldId('reps-high')}
              label={t('targetRepsHigh')}
              value={item.targetRepsHigh}
              min={1}
              max={200}
              onChange={(value) => onChange({ ...item, targetRepsHigh: value })}
            />
            <TargetField
              id={fieldId('rpe')}
              label={t('targetRpe')}
              value={item.targetRpe}
              min={0}
              max={10}
              // Half points, the granularity the scale is used at and the one
              // `routineItemSchema` enforces with `multipleOf(0.5)`.
              step={0.5}
              onChange={(value) => onChange({ ...item, targetRpe: value })}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/** One optional numeric target. `inputMode="decimal"` so a phone opens the
 *  number pad; `type="number"` alone does that on iOS but not everywhere. */
function TargetField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl bg-background tabular-nums"
      />
    </div>
  );
}
