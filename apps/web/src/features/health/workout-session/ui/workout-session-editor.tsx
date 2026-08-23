'use client';

import { useState } from 'react';
import { Button, ConfirmDeleteDialog } from '@byte-of-me/ui';
import { CircleCheck, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { BackToGymLink } from './back-to-gym-link';
import { SetEditorModal } from './set-editor-modal';
import { WorkoutExerciseCard } from './workout-exercise-card';

import type { WorkoutSessionDetail, WorkoutSetRow } from '@/entities/workout';
import { ExercisePickerModal } from '@/features/health/exercise-catalog';
import {
  nextSetDraft,
  type SetDraft,
  toSetDraft,
} from '@/features/health/workout-session/lib/set-drafts';
import { useWorkoutSessionMutations } from '@/features/health/workout-session/model/use-workout-session';
import { splitMinutes } from '@/shared/lib/health/duration';
import { formatClock, formatDayKey } from '@/shared/lib/local-date-format';

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
 * A FINISHED session, open for correction: its exercises, their sets, and the
 * writes that fix them.
 *
 * **This is the post-workout path, not an in-gym logger.** There are no rest
 * timers, no wake locks and no offline queue here on purpose — those belong to
 * `WorkoutLiveLogger`, which is what an OPEN session renders instead
 * (`workout-session-view.tsx` decides between them, on the data rather than on
 * the URL). The consequence shows up in one visible decision: a set's
 * `completedAt` is carried through unchanged and never stamped with "now",
 * because stamping the present onto a set performed two hours ago is a worse
 * record than leaving it blank. The live path stamps it, because there "now"
 * is when the set actually ended.
 *
 * A finished session stays fully EDITABLE. Correcting yesterday's numbers is
 * the normal case for a log read after the fact, and `endedAt` is the only
 * thing "finished" means — nothing about it makes the sets read-only. What it
 * does mean is that there is no Finish button here at all: the session is
 * already closed, so there is nothing left to press.
 *
 * It takes the session as a PROP rather than reading it, because the loading,
 * error and missing states belong to the read and both modes need the
 * identical three — they live in the view above (AGENTS §11.3).
 */
export function WorkoutSessionEditor({
  session,
  timeZone,
}: {
  session: WorkoutSessionDetail;
  /** The request's zone, resolved on the server, so a clock time renders
   *  identically either side of hydration. */
  timeZone: string;
}) {
  const t = useTranslations('dashboard.health.workout');
  const tUnits = useTranslations('dashboard.health.units');
  const tGym = useTranslations('dashboard.health.gym');
  const locale = useLocale();

  const mutations = useWorkoutSessionMutations(session.id);

  const [setTarget, setSetTarget] = useState<SetEditorTarget | null>(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <BackToGymLink />

          <header className="flex flex-col gap-2 rounded-3xl border bg-card p-5 shadow">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CircleCheck aria-hidden className="size-3.5 shrink-0" />
              {t('finishedAt', {
                time: formatClock(session.endedAt ?? '', locale, timeZone),
              })}
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

      {/* No pinned bar. The live logger has one because it carries the action
          the whole screen exists for; here the session is already closed and
          every remaining action is a correction, which belongs beside the
          thing being corrected rather than stapled across the bottom. */}
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
