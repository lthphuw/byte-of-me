'use client';

import { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Label } from '@byte-of-me/ui';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SetDraft } from '@/features/gym/workout-session/lib/set-drafts';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

/**
 * Add or correct one set.
 *
 * **Which inputs appear is decided by the exercise's METRIC**, and that is the
 * whole reason `WorkoutExerciseRow` carries the catalogue's `metric` field
 * rather than only a name: a plank has no reps and a pull-up no external load,
 * so a single reps-and-weight pair would ask two of the four kinds of exercise
 * for numbers that do not exist. `weighted_bodyweight` shows the same weight
 * box under a different label, because the number means "added", not "total",
 * and a box labelled "Weight" invites someone to type their bodyweight into
 * it.
 *
 * RPE and the warm-up flag are on every metric. The flag matters more than it
 * looks: it EXCLUDES the set from volume, from personal bests and from the
 * per-muscle set count, so the hint under it says so rather than leaving the
 * reader to find out from a statistic that quietly inflated.
 *
 * Deleting lives in this modal rather than on the row, so the set list stays a
 * list of numbers instead of a list of numbers with a destructive button
 * beside each one. A set is cheap to re-enter, so there is no confirm step —
 * unlike a whole session, which takes its exercises and every set with it.
 *
 * The draft resets from `initial` when the modal OPENS rather than on every
 * render: re-seeding continuously would throw away a keystroke, and reopening
 * on another set would otherwise show the last one's numbers.
 */
export function SetEditorModal({
  open,
  onOpenChange,
  initial,
  metric,
  exerciseName,
  onSubmit,
  onDelete,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: SetDraft;
  /** The catalogue metric this exercise records, which decides the fields. */
  metric: string;
  exerciseName: string;
  onSubmit: (draft: SetDraft) => void;
  /** Absent while adding — there is nothing to delete yet. */
  onDelete?: () => void;
  isSaving: boolean;
}) {
  const t = useTranslations('dashboard.health.workout');
  const [draft, setDraft] = useState<SetDraft>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const showWeight =
    metric === 'weight_reps' || metric === 'weighted_bodyweight';
  const showReps = metric !== 'time';
  const showDuration = metric === 'time';

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={draft.id ? t('editSet') : t('addSet')}
      description={exerciseName}
      footer={
        <Button
          type="button"
          disabled={isSaving}
          onClick={() => onSubmit(draft)}
          className="h-14 w-full rounded-2xl text-base"
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          {showWeight ? (
            <NumberField
              id="set-weight"
              label={
                metric === 'weighted_bodyweight'
                  ? t('addedWeight')
                  : t('weight')
              }
              value={draft.weightKg}
              min={0}
              max={9999.99}
              step={0.25}
              onChange={(value) =>
                setDraft((current) => ({ ...current, weightKg: value }))
              }
            />
          ) : null}

          {showReps ? (
            <NumberField
              id="set-reps"
              label={t('reps')}
              value={draft.reps}
              min={0}
              max={1000}
              step={1}
              onChange={(value) =>
                setDraft((current) => ({ ...current, reps: value }))
              }
            />
          ) : null}

          {showDuration ? (
            <NumberField
              id="set-duration"
              label={t('durationSec')}
              value={draft.durationSec}
              min={0}
              max={86400}
              step={1}
              onChange={(value) =>
                setDraft((current) => ({ ...current, durationSec: value }))
              }
            />
          ) : null}

          <NumberField
            id="set-rpe"
            label={t('rpe')}
            value={draft.rpe}
            min={0}
            max={10}
            step={0.5}
            hint={t('rpeHint')}
            onChange={(value) =>
              setDraft((current) => ({ ...current, rpe: value }))
            }
          />
        </div>

        <div className="space-y-2">
          {/* A real `<label>` around a 44px row, so the words are part of the
              target rather than a caption beside a 16px box. */}
          <label
            htmlFor="set-warmup"
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border bg-card px-4 transition-colors duration-200 hover:bg-muted"
          >
            <Checkbox
              id="set-warmup"
              checked={draft.isWarmup}
              onCheckedChange={(checked) =>
                setDraft((current) => ({
                  ...current,
                  isWarmup: checked === true,
                }))
              }
            />
            <span className="text-sm font-medium">{t('warmup')}</span>
          </label>

          <p className="text-xs text-muted-foreground">{t('warmupHint')}</p>
        </div>

        {onDelete ? (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            className="h-12 w-full rounded-2xl text-destructive-text"
          >
            <Trash2 aria-hidden className="mr-2 size-4" />
            {t('deleteSet')}
          </Button>
        ) : null}
      </div>
    </ResponsiveModal>
  );
}

/** One numeric measure. `inputMode="decimal"` opens a phone's number pad,
 *  which `type="number"` alone does on iOS but not everywhere. */
function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-16 rounded-2xl bg-background text-xl tabular-nums transition-colors duration-200 hover:border-primary/40"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
