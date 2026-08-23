'use client';

import { useState } from 'react';
import { Button, ConfirmDeleteDialog } from '@byte-of-me/ui';
import { ArrowLeft, CircleCheck, CircleDot, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { FinishWorkoutModal } from './finish-workout-modal';
import { SetEditorModal } from './set-editor-modal';
import { WorkoutExerciseCard } from './workout-exercise-card';

import type { WorkoutSetRow } from '@/entities/workout';
import { ExercisePickerModal } from '@/features/health/exercise-catalog';
import {
  nextSetDraft,
  type SetDraft,
  toSetDraft,
} from '@/features/health/workout-session/lib/set-drafts';
import {
  useWorkoutSession,
  useWorkoutSessionMutations,
} from '@/features/health/workout-session/model/use-workout-session';
import { Link } from '@/shared/i18n/navigation';
import { splitMinutes } from '@/shared/lib/health/duration';
import { formatClock, formatDayKey } from '@/shared/lib/local-date-format';
import { cn } from '@/shared/lib/utils';

const MS_PER_MINUTE = 60_000;

/** Which set the editor is open on, and which exercise it belongs to. One
 *  piece of state rather than three, so "open" and "what it is editing" cannot
 *  disagree. */
interface SetEditorTarget {
  workoutExerciseId: string;
  exerciseName: string;
  metric: string;
  draft: SetDraft;
  /** True while correcting a stored set — the only case with anything to
   *  delete. */
  isExisting: boolean;
}

/**
 * One session, open for entry: its exercises, their sets, and the write that
 * closes it.
 *
 * **This is the post-workout path, not an in-gym logger.** There are no rest
 * timers, no wake locks and no offline queue here on purpose — those belong to
 * the live logger, which is a separate surface with different failure modes.
 * The consequence shows up in one visible decision: a set's `completedAt` is
 * carried through unchanged and never stamped with "now", because stamping the
 * present onto a set performed two hours ago is a worse record than leaving it
 * blank.
 *
 * A finished session stays fully editable. Correcting yesterday's numbers is
 * the normal case for a log written after the fact, and `endedAt` is the only
 * thing "finished" means — nothing about it makes the sets read-only. What
 * changes is the primary action: the pinned bar carries **Finish** while the
 * session is open and disappears once it is closed, so a finished session has
 * no button to press twice.
 *
 * A missing session renders in place rather than throwing. `getWorkoutSession`
 * returns `{ success: true, data: null }` for "no such session, for you" —
 * one answer for both, deliberately — and this screen shows a line and a way
 * back instead of handing the page to the root `error.tsx`.
 */
export function WorkoutSessionEditor({
  sessionId,
  timeZone,
}: {
  sessionId: string;
  /** The request's zone, resolved on the server, so a clock time renders
   *  identically either side of hydration. */
  timeZone: string;
}) {
  const t = useTranslations('dashboard.health.workout');
  const tUnits = useTranslations('dashboard.health.units');
  const tGym = useTranslations('dashboard.health.gym');
  const tError = useTranslations('dashboard.health.errors');
  const locale = useLocale();

  const query = useWorkoutSession(sessionId);
  const mutations = useWorkoutSessionMutations(sessionId);

  const [setTarget, setSetTarget] = useState<SetEditorTarget | null>(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isFinishOpen, setFinishOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);

  const result = query.data;
  const session = result?.success ? result.data : null;
  const loadError = query.isError
    ? tError('load')
    : result && !result.success
    ? result.errorMsg
    : null;

  const backLink = (
    <Link
      href="/space/health/gym"
      className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground underline underline-offset-4 transition-colors duration-200 hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-4 shrink-0" />
      {t('back')}
    </Link>
  );

  if (query.isPending) {
    return (
      <Frame>
        {backLink}
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t('loading')}
        </p>
      </Frame>
    );
  }

  if (loadError) {
    return (
      <Frame>
        {backLink}
        {/* `destructive-text`, not `destructive`: §14 records that the fill
            token measures 3.76:1 as text. */}
        <p className="text-sm text-destructive-text">{loadError}</p>
      </Frame>
    );
  }

  if (!session) {
    return (
      <Frame>
        {backLink}
        <p className="text-sm text-muted-foreground">{t('notFound')}</p>
      </Frame>
    );
  }

  const isOpen = session.endedAt === null;
  const durationMin = session.endedAt
    ? Math.max(
        0,
        Math.round(
          (new Date(session.endedAt).getTime() -
            new Date(session.startedAt).getTime()) /
            MS_PER_MINUTE
        )
      )
    : null;

  const finishButton = (
    <Button
      type="button"
      onClick={() => setFinishOpen(true)}
      disabled={mutations.isFinishing}
      className="h-14 w-full rounded-2xl text-base"
    >
      <CircleCheck aria-hidden className="mr-2 size-5" />
      {t('finish')}
    </Button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          {backLink}

          <header className="flex flex-col gap-2 rounded-3xl border bg-card p-5 shadow">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {isOpen ? (
                <>
                  <CircleDot aria-hidden className="size-3.5 shrink-0" />
                  {t('inProgressBadge')}
                </>
              ) : (
                <>
                  <CircleCheck aria-hidden className="size-3.5 shrink-0" />
                  {t('finishedAt', {
                    time: formatClock(session.endedAt ?? '', locale, timeZone),
                  })}
                </>
              )}
            </p>

            <h2 className="break-safe text-2xl font-semibold">
              {session.title}
            </h2>

            <p className="text-sm tabular-nums text-muted-foreground">
              {formatDayKey(session.localDate, locale)}
              <span aria-hidden> · </span>
              {tGym('startedAt', {
                time: formatClock(session.startedAt, locale, timeZone),
              })}
            </p>

            <p className="break-safe flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums text-muted-foreground">
              <span>
                {tGym('exerciseCount', { n: session.exercises.length })}
              </span>

              {durationMin !== null ? (
                <span>{tUnits('hoursMinutes', splitMinutes(durationMin))}</span>
              ) : null}

              {session.sessionRpe !== null ? (
                <span>
                  {tGym('sessionRpe')} {session.sessionRpe}
                </span>
              ) : null}
            </p>

            {session.notes ? (
              <p className="break-safe text-sm text-muted-foreground">
                {session.notes}
              </p>
            ) : null}
          </header>

          {session.exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noExercises')}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {session.exercises.map((exercise, index) => (
                <WorkoutExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  total={session.exercises.length}
                  isReordering={mutations.isReordering}
                  onAddSet={() =>
                    setSetTarget({
                      workoutExerciseId: exercise.id,
                      exerciseName: exercise.exerciseName,
                      metric: exercise.metric,
                      draft: nextSetDraft(exercise.sets.at(-1)),
                      isExisting: false,
                    })
                  }
                  onEditSet={(set: WorkoutSetRow) =>
                    setSetTarget({
                      workoutExerciseId: exercise.id,
                      exerciseName: exercise.exerciseName,
                      metric: exercise.metric,
                      draft: toSetDraft(set),
                      isExisting: true,
                    })
                  }
                  onMove={(delta) => {
                    // The COMPLETE order, because that is what the action
                    // takes: it rejects any list that is not exactly this
                    // session's own exercises, which makes a partial order —
                    // and the duplicate positions it would leave — impossible.
                    const ids = session.exercises.map((row) => row.id);
                    const target = index + delta;
                    if (target < 0 || target >= ids.length) return;

                    const [moved] = ids.splice(index, 1);
                    ids.splice(target, 0, moved);
                    mutations.reorder(ids);
                  }}
                  onRemove={() => mutations.removeExercise(exercise.id)}
                />
              ))}
            </ul>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={mutations.isAddingExercise}
            onClick={() => setPickerOpen(true)}
            className="h-12 w-full rounded-2xl"
          >
            <Plus aria-hidden className="mr-2 size-4" />
            {t('addExercise')}
          </Button>

          {isOpen ? (
            <div className="hidden lg:block">{finishButton}</div>
          ) : null}

          {/* Deleting a whole session takes its exercises and every set with
              it — `onDelete: Cascade` on both — so it sits at the bottom,
              outlined rather than filled, and behind a confirmation. A set is
              cheap to re-enter; sixty of them are not. */}
          <Button
            type="button"
            variant="outline"
            disabled={mutations.isRemovingSession}
            onClick={() => setDeleteOpen(true)}
            className="h-12 w-full rounded-2xl text-destructive-text"
          >
            <Trash2 aria-hidden className="mr-2 size-4" />
            {t('deleteWorkout')}
          </Button>
        </div>
      </div>

      {/* Outside the scroll area, so it is under a thumb on every frame, and
          clear of the iOS home indicator. Gone at `lg`, where the inline
          button above is the one that exists — and gone entirely once the
          session is closed, so there is no button left to press twice. */}
      {isOpen ? (
        <div className="shrink-0 border-t bg-background px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
          <div className="mx-auto w-full max-w-4xl">{finishButton}</div>
        </div>
      ) : null}

      <ExercisePickerModal
        open={isPickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(exercise) => mutations.addExercise(exercise.id)}
      />

      {setTarget ? (
        <SetEditorModal
          open
          onOpenChange={(next) => {
            if (!next) setSetTarget(null);
          }}
          initial={setTarget.draft}
          metric={setTarget.metric}
          exerciseName={setTarget.exerciseName}
          isSaving={mutations.isSavingSet}
          onSubmit={(draft) =>
            mutations.saveSet(
              { draft, workoutExerciseId: setTarget.workoutExerciseId },
              { onSuccess: () => setSetTarget(null) }
            )
          }
          onDelete={
            setTarget.isExisting && setTarget.draft.id
              ? () => {
                  const id = setTarget.draft.id;
                  if (!id) return;

                  mutations.removeSet(id);
                  setSetTarget(null);
                }
              : undefined
          }
        />
      ) : null}

      <FinishWorkoutModal
        open={isFinishOpen}
        onOpenChange={setFinishOpen}
        initialNotes={session.notes ?? ''}
        isSaving={mutations.isFinishing}
        onSubmit={(input) =>
          mutations.finish(input, { onSuccess: () => setFinishOpen(false) })
        }
      />

      <ConfirmDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => mutations.removeSession()}
        isLoading={mutations.isRemovingSession}
        title={t('deleteWorkoutTitle')}
        description={t('deleteWorkoutHint')}
        actionText={t('deleteWorkout')}
        cancelText={t('cancel')}
      />
    </div>
  );
}

/** The screen's frame, shared by its loading, error and empty states so none
 *  of them changes the page's width, padding or rhythm. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-x-clip')}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
