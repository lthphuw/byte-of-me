'use client';

import { useState } from 'react';
import { Button, useDebounce } from '@byte-of-me/ui';
import { Archive, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ExerciseCard } from './exercise-card';
import { ExerciseFormModal } from './exercise-form-modal';
import { MuscleFilter } from './muscle-filter';

import type { ExerciseRow } from '@/entities/exercise';
import { useExerciseList } from '@/features/gym/exercise-catalog/model/use-exercise-list';
import {
  type ExerciseFormValues,
  useExerciseMutations,
} from '@/features/gym/exercise-catalog/model/use-exercise-mutations';
import { cn } from '@/shared/lib/utils';
import { FilterSearchInput } from '@/shared/ui/filter-search-input';

/** Long enough that typing a whole word is one request, short enough that the
 *  list does not feel detached from the box. The same figure the notes search
 *  palette settled on. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The exercise catalogue: search it, filter it by muscle, add to it, correct
 * it, retire an entry.
 *
 * **There is no delete, and that is a schema decision, not an omission.**
 * `workout_exercises.exercise_id` is `ON DELETE RESTRICT`, so removing an
 * entry would either fail or — if the constraint were ever relaxed — take
 * every session that used it with it. Archiving is a TOGGLE: the same write
 * with `isArchived` flipped either way, which is why one button says both
 * Archive and Restore and why "Show archived" is a filter rather than a
 * separate screen.
 *
 * The search box drives a debounced value, not the query directly: every
 * keystroke is a new query key, and a key per character is a request per
 * character. `useExerciseList` keeps the previous list on screen while the new
 * one resolves, so the page never blinks empty mid-word.
 *
 * The action bar is the module's: pinned outside the scroll area below `lg`
 * where a thumb already is, inline at the foot of the column at `lg`, and
 * exactly one of the two is ever rendered — `hidden` is `display: none`, so
 * the other is neither focusable nor in the accessibility tree.
 */
export function ExerciseCatalog() {
  const t = useTranslations('dashboard.health.exercises');
  const tError = useTranslations('dashboard.health.errors');

  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [debouncedSearch] = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const [editing, setEditing] = useState<ExerciseFormValues | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);

  const query = useExerciseList({
    search: debouncedSearch.trim(),
    muscle,
    includeArchived,
  });
  const mutations = useExerciseMutations();

  const result = query.data;
  const rows = result?.success ? result.data : [];
  const loadError = query.isError
    ? tError('load')
    : result && !result.success
    ? result.errorMsg
    : null;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (exercise: ExerciseRow) => {
    setEditing({
      id: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      secondaryMuscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      metric: exercise.metric,
    });
    setFormOpen(true);
  };

  const createButton = (
    <Button
      type="button"
      onClick={openCreate}
      className="h-14 w-full rounded-2xl text-base"
    >
      <Plus aria-hidden className="mr-2 size-5" />
      {t('create')}
    </Button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <header className="space-y-2">
            <h2 className="text-2xl font-semibold">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </header>

          <div className="flex flex-col gap-3">
            <FilterSearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('search')}
              clearLabel={t('clearSearch')}
            />

            <MuscleFilter value={muscle} onChange={setMuscle} />

            {/* A toggle, so the archived rows join the list in place rather
                than living on a screen of their own. `aria-pressed` plus the
                inverted fill plus the icon — three cues, none a hue (§14). */}
            <button
              type="button"
              aria-pressed={includeArchived}
              onClick={() => setIncludeArchived((current) => !current)}
              className={cn(
                'flex h-11 items-center gap-2 self-start rounded-2xl border px-4 text-sm',
                'transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                includeArchived
                  ? 'border-primary bg-primary font-medium text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Archive aria-hidden className="size-4 shrink-0" />
              {t('showArchived')}
            </button>
          </div>

          {loadError ? (
            /* `destructive-text`, not `destructive`: §14 records that the fill
               token measures 3.76:1 as text. */
            <p className="text-sm text-destructive-text">{loadError}</p>
          ) : null}

          {query.isPending ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t('loading')}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {search.trim() === '' && muscle === ''
                ? t('emptyAll')
                : t('empty')}
            </p>
          ) : (
            <section className="flex flex-col gap-4">
              <p className="text-xs tabular-nums text-muted-foreground">
                {t('count', { n: rows.length })}
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                {rows.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onEdit={openEdit}
                    onToggleArchive={(row) =>
                      mutations.setArchived({
                        row,
                        isArchived: !row.isArchived,
                      })
                    }
                    isArchiving={mutations.archivingId === exercise.id}
                  />
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {t('archiveHint')}
              </p>
            </section>
          )}

          <div className="hidden lg:block">{createButton}</div>
        </div>
      </div>

      {/* Outside the scroll area, exactly like the sleep form's save bar.
          Gone at `lg`, where a bar stapled across a monitor is a phone
          pattern in a browser window. The safe-area inset belongs HERE, not
          on `SpaceShell`'s `#space-content`: that element has no background of
          its own, so painting the inset there left the home-indicator band
          showing the grey ground behind this bar instead of this bar's own
          `bg-background`. */}
      <div className="shrink-0 border-t bg-background px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto w-full max-w-4xl">{createButton}</div>
      </div>

      <ExerciseFormModal
        open={isFormOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        isSaving={mutations.isSaving}
        onSubmit={(values) =>
          mutations.save(values, { onSuccess: () => setFormOpen(false) })
        }
      />
    </div>
  );
}
