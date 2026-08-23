'use client';

import { useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { RoutineFormModal } from './routine-form-modal';

import type { RoutineRow } from '@/entities/exercise';
import {
  type RoutineDraft,
  toRoutineDraft,
} from '@/features/gym/routine-editor/lib/routine-drafts';
import {
  useRoutineMutations,
  useRoutines,
} from '@/features/gym/routine-editor/model/use-routines';
import { cn } from '@/shared/lib/utils';

/**
 * The routine surface: every plan, in the order they are performed, with one
 * way in and one way out of each.
 *
 * **Archive, never delete.** `WorkoutSession.routineId` is `onDelete: SetNull`
 * and `WorkoutSession.title` is a SNAPSHOT of the routine's name, so deleting
 * a plan would silently cut every past session's link back to it while leaving
 * the heading intact — a history that no longer knows what it was following.
 * Archiving takes it out of the start picker and keeps the link.
 *
 * The card prints the first exercises rather than only a count, because "Push
 * day" and "Push day (v2)" are told apart by what is in them. It stops at
 * three and says how many more, so a twelve-exercise plan does not turn the
 * list into a document.
 *
 * The action bar is the module's: pinned outside the scroll area below `lg`,
 * inline at the foot of the column at `lg`, and only ever one of the two in
 * the DOM.
 */
export function RoutineManager() {
  const t = useTranslations('dashboard.gym.routines');
  const tError = useTranslations('dashboard.gym.errors');

  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<RoutineDraft | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);

  const query = useRoutines(includeArchived);
  const mutations = useRoutineMutations();

  const result = query.data;
  const routines = result?.success ? result.data : [];
  const loadError = query.isError
    ? tError('load')
    : result && !result.success
    ? result.errorMsg
    : null;

  const createButton = (
    <Button
      type="button"
      onClick={() => {
        setEditing(null);
        setFormOpen(true);
      }}
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

          {loadError ? (
            <p className="text-sm text-destructive-text">{loadError}</p>
          ) : null}

          {query.isPending ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t('loading')}
            </p>
          ) : routines.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  isArchiving={mutations.archivingId === routine.id}
                  onEdit={() => {
                    setEditing(toRoutineDraft(routine));
                    setFormOpen(true);
                  }}
                  onToggleArchive={() =>
                    mutations.setArchived({
                      row: routine,
                      isArchived: !routine.isArchived,
                    })
                  }
                />
              ))}
            </ul>
          )}

          <p className="text-xs text-muted-foreground">{t('archiveHint')}</p>

          <div className="hidden lg:block">{createButton}</div>
        </div>
      </div>

      {/* The safe-area inset belongs HERE, not on `SpaceShell`'s
          `#space-content`: that element has no background of its own, so
          painting the inset there left the home-indicator band showing the
          grey ground behind this bar instead of this bar's own
          `bg-background`. */}
      <div className="shrink-0 border-t bg-background px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto w-full max-w-4xl">{createButton}</div>
      </div>

      <RoutineFormModal
        open={isFormOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        isSaving={mutations.isSaving}
        onSubmit={(draft) =>
          mutations.save(draft, { onSuccess: () => setFormOpen(false) })
        }
      />
    </div>
  );
}

/** How many exercises a card names before it starts counting instead. */
const PREVIEW_ITEMS = 3;

function RoutineCard({
  routine,
  onEdit,
  onToggleArchive,
  isArchiving,
}: {
  routine: RoutineRow;
  onEdit: () => void;
  onToggleArchive: () => void;
  isArchiving: boolean;
}) {
  const t = useTranslations('dashboard.gym.routines');

  const preview = routine.items.slice(0, PREVIEW_ITEMS);
  const rest = routine.items.length - preview.length;

  return (
    <li className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow transition-colors duration-200 hover:border-primary/40">
      <div className="min-w-0 space-y-1">
        <p className="break-safe text-base font-semibold">{routine.name}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {t('itemCount', { n: routine.items.length })}
        </p>
      </div>

      {routine.notes ? (
        <p className="break-safe text-sm text-muted-foreground">
          {routine.notes}
        </p>
      ) : null}

      {preview.length > 0 ? (
        <ol className="flex flex-col gap-1">
          {preview.map((item, index) => (
            <li
              key={item.id}
              className="break-safe flex gap-2 text-sm text-muted-foreground"
            >
              <span aria-hidden className="tabular-nums">
                {index + 1}.
              </span>
              <span className="min-w-0">{item.exerciseName}</span>
            </li>
          ))}
          {rest > 0 ? (
            <li className="text-sm tabular-nums text-muted-foreground">
              {t('moreItems', { n: rest })}
            </li>
          ) : null}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">{t('noItems')}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {routine.isArchived ? (
          <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {t('archived')}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label={t('editNamed', { name: routine.name })}
            onClick={onEdit}
            className="h-11 rounded-xl px-3"
          >
            <Pencil aria-hidden className="mr-2 size-4" />
            {t('edit')}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isArchiving}
            aria-label={
              routine.isArchived
                ? t('restoreNamed', { name: routine.name })
                : t('archiveNamed', { name: routine.name })
            }
            onClick={onToggleArchive}
            className="h-11 rounded-xl px-3"
          >
            {routine.isArchived ? (
              <ArchiveRestore aria-hidden className="mr-2 size-4" />
            ) : (
              <Archive aria-hidden className="mr-2 size-4" />
            )}
            {routine.isArchived ? t('restore') : t('archive')}
          </Button>
        </div>
      </div>
    </li>
  );
}
