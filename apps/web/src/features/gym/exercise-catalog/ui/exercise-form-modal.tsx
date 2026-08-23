'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Label } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import type { ExerciseFormValues } from '@/features/gym/exercise-catalog/model/use-exercise-mutations';
import { labelForCode, useGymLabels } from '@/shared/hooks/use-gym-labels';
import { EQUIPMENT_ICON, METRIC_ICON } from '@/shared/ui/gym-icons';
import { FieldHeading, OptionTileGrid } from '@/shared/ui/option-tile-grid';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

/** What a brand-new entry opens on. Pre-answered rather than empty: all three
 *  are required by `exerciseCreateSchema`, and a form that opens with three
 *  unanswered required questions reads as work where the common case is
 *  "type a name and save". */
const BLANK: ExerciseFormValues = {
  id: null,
  name: '',
  primaryMuscle: 'chest',
  secondaryMuscles: [],
  equipment: 'barbell',
  metric: 'weight_reps',
};

/**
 * Add or edit one catalogue entry.
 *
 * The same component for both, because the fields are identical and the only
 * difference is whether `id` travels — splitting it would leave two forms to
 * keep in step over a `name` field.
 *
 * **Five questions, four of them answered by tapping a tile.** The muscle,
 * equipment and metric vocabularies are closed sets of at most seventeen
 * values, which is a grid rather than a `<select>`: a native select on a phone
 * hides its options behind a second system sheet, and the whole point of this
 * module's language is that the answers are visible and large. Selection
 * inverts rather than tints, for the reason `OptionTileGrid` documents.
 *
 * **Primary and secondary cannot overlap.** Choosing a primary muscle drops it
 * from the secondary list rather than rejecting the save afterwards — the
 * schema's own comment is "never the primary one twice over", and the moment
 * to enforce that is while the reader is looking at the control.
 *
 * The state resets from `initial` whenever the modal OPENS, not on every
 * render: keeping it in `useState` is what lets the form be edited, and
 * re-seeding on each render would throw a keystroke away. `open` is in the
 * dependency list so reopening on a different row does not show the last
 * row's values.
 */
export function ExerciseFormModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited, or null for a new entry. */
  initial: ExerciseFormValues | null;
  onSubmit: (values: ExerciseFormValues) => void;
  isSaving: boolean;
}) {
  const t = useTranslations('dashboard.health.exercises');
  const labels = useGymLabels();
  const [values, setValues] = useState<ExerciseFormValues>(initial ?? BLANK);

  useEffect(() => {
    if (open) setValues(initial ?? BLANK);
  }, [open, initial]);

  const canSave = values.name.trim() !== '' && !isSaving;

  const muscleOptions = labels.muscles.map((code) => ({
    value: code,
    label: labels.muscle[code],
  }));

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? t('editTitle') : t('createTitle')}
      description={t('description')}
      footer={
        <Button
          type="button"
          disabled={!canSave}
          onClick={() => onSubmit(values)}
          className="h-14 w-full rounded-2xl text-base"
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <Label htmlFor="exercise-name">{t('name')}</Label>
          <Input
            id="exercise-name"
            value={values.name}
            maxLength={120}
            placeholder={t('namePlaceholder')}
            onChange={(event) =>
              setValues((current) => ({ ...current, name: event.target.value }))
            }
            className="h-14 rounded-2xl bg-background text-base transition-colors duration-200 hover:border-primary/40"
          />
          {values.name.trim() === '' ? (
            <p className="text-xs text-muted-foreground">{t('nameRequired')}</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <FieldHeading
            label={t('primaryMuscle')}
            answer={labelForCode(labels.muscle, values.primaryMuscle)}
            answered
          />
          <OptionTileGrid
            ariaLabel={t('primaryMuscle')}
            options={muscleOptions}
            selected={[values.primaryMuscle]}
            columns="grid-cols-3 sm:grid-cols-4"
            // Single-select: a tap always sets, never clears. The field is
            // required, so "no primary muscle" is not a state the form can be
            // in — unlike the optional answers below it.
            onToggle={(value) =>
              setValues((current) => ({
                ...current,
                primaryMuscle: value,
                secondaryMuscles: current.secondaryMuscles.filter(
                  (code) => code !== value
                ),
              }))
            }
          />
        </div>

        <div className="space-y-3">
          <FieldHeading
            label={t('secondaryMuscles')}
            answer={
              values.secondaryMuscles.length === 0
                ? t('noSecondary')
                : values.secondaryMuscles
                    .map((code) => labelForCode(labels.muscle, code))
                    .join(', ')
            }
            answered={values.secondaryMuscles.length > 0}
          />
          <p className="text-xs text-muted-foreground">{t('secondaryHint')}</p>
          <OptionTileGrid
            ariaLabel={t('secondaryMuscles')}
            options={muscleOptions.filter(
              (option) => option.value !== values.primaryMuscle
            )}
            selected={values.secondaryMuscles}
            columns="grid-cols-3 sm:grid-cols-4"
            onToggle={(value) =>
              setValues((current) => ({
                ...current,
                secondaryMuscles: current.secondaryMuscles.includes(value)
                  ? current.secondaryMuscles.filter((code) => code !== value)
                  : [...current.secondaryMuscles, value],
              }))
            }
          />
        </div>

        <div className="space-y-3">
          <FieldHeading
            label={t('equipment')}
            answer={labelForCode(labels.equipment, values.equipment)}
            answered
          />
          <OptionTileGrid
            ariaLabel={t('equipment')}
            options={labels.equipments.map((code) => ({
              value: code,
              label: labels.equipment[code],
              icon: EQUIPMENT_ICON[code],
            }))}
            selected={[values.equipment]}
            columns="grid-cols-3 sm:grid-cols-4"
            onToggle={(value) =>
              setValues((current) => ({ ...current, equipment: value }))
            }
          />
        </div>

        <div className="space-y-3">
          <FieldHeading
            label={t('metric')}
            answer={labelForCode(labels.metric, values.metric)}
            answered
          />
          <OptionTileGrid
            ariaLabel={t('metric')}
            options={labels.metrics.map((code) => ({
              value: code,
              label: labels.metric[code],
              icon: METRIC_ICON[code],
            }))}
            selected={[values.metric]}
            columns="grid-cols-2"
            onToggle={(value) =>
              setValues((current) => ({ ...current, metric: value }))
            }
          />
        </div>
      </div>
    </ResponsiveModal>
  );
}
