'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { MuscleFilter } from './muscle-filter';

import type { ExerciseRow } from '@/entities/exercise';
import { useExerciseList } from '@/features/gym/exercise-catalog/model/use-exercise-list';
import { labelForCode, useGymLabels } from '@/shared/hooks/use-gym-labels';
import { FilterSearchInput } from '@/shared/ui/filter-search-input';
import { EQUIPMENT_ICON, iconForCode } from '@/shared/ui/gym-icons';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Choose one exercise out of the catalogue.
 *
 * Lives in the catalogue slice rather than in a slice of its own, and both the
 * routine editor and the session editor reach it through this slice's barrel.
 * It reads the same `exerciseKeys.list(...)` cache the catalogue screen fills,
 * so opening the picker on a page that already listed exercises is free — a
 * second slice would have meant a second query hook and, sooner or later, a
 * second key literal.
 *
 * ARCHIVED ENTRIES ARE NEVER OFFERED. That is what archiving is for: the row
 * stays so a past session keeps resolving, and it leaves the picker. The
 * filter here is fixed rather than exposed, because "add an archived exercise
 * to a new plan" is not a thing anyone means to do.
 *
 * Picking closes the modal. There is no confirm step and no multi-select: the
 * routine editor and the session editor both append one item at a time, and
 * both want the reader back on the list they were building.
 *
 * The filters reset every time it opens. A picker that reopens holding last
 * time's search is a list that looks empty for reasons off screen.
 */
export function ExercisePickerModal({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (exercise: ExerciseRow) => void;
}) {
  const t = useTranslations('dashboard.gym.exercises');
  const tError = useTranslations('dashboard.gym.errors');
  const labels = useGymLabels();

  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [debouncedSearch] = useDebounce(search, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!open) return;

    setSearch('');
    setMuscle('');
  }, [open]);

  const query = useExerciseList({
    search: debouncedSearch.trim(),
    muscle,
    includeArchived: false,
  });

  const result = query.data;
  const rows = result?.success ? result.data : [];
  const loadError = query.isError
    ? tError('load')
    : result && !result.success
    ? result.errorMsg
    : null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('pickTitle')}
      description={t('description')}
    >
      <div className="flex flex-col gap-3">
        <FilterSearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('search')}
          clearLabel={t('clearSearch')}
        />

        <MuscleFilter value={muscle} onChange={setMuscle} />

        {loadError ? (
          <p className="text-sm text-destructive-text">{loadError}</p>
        ) : null}

        {query.isPending ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t('loading')}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((exercise) => {
              const EquipmentIcon = iconForCode(
                EQUIPMENT_ICON,
                exercise.equipment
              );

              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(exercise);
                      onOpenChange(false);
                    }}
                    className="flex min-h-14 w-full flex-col items-start justify-center gap-0.5 rounded-2xl border bg-card px-4 py-2.5 text-left transition-colors duration-200 hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="break-safe text-sm font-medium">
                      {exercise.name}
                    </span>
                    <span className="break-safe flex items-center gap-1.5 text-xs text-muted-foreground">
                      {labelForCode(labels.muscle, exercise.primaryMuscle)}
                      <span aria-hidden>·</span>
                      {EquipmentIcon ? (
                        <EquipmentIcon aria-hidden className="size-3.5" />
                      ) : null}
                      {labelForCode(labels.equipment, exercise.equipment)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ResponsiveModal>
  );
}
