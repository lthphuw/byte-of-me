'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, ConfirmDeleteDialog } from '@byte-of-me/ui';
import { Check, CircleCheck, CloudOff, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BackToGymLink } from './back-to-gym-link';
import { ExerciseSwitchSheet } from './exercise-switch-sheet';
import { FinishSummary } from './finish-summary';
import { FinishWorkoutModal } from './finish-workout-modal';
import { LiveExercisePane } from './live-exercise-pane';
import { LiveSetInputs, type SetField } from './live-set-inputs';
import { NumpadSheet } from './numpad-sheet';
import { RestTimerBar } from './rest-timer-bar';
import { SetEditorModal } from './set-editor-modal';

import type { WorkoutSessionDetail, WorkoutSetRow } from '@/entities/workout';
import { ExercisePickerModal } from '@/features/health/exercise-catalog';
import {
  elapsedSeconds,
  formatSeconds,
} from '@/features/health/workout-session/lib/live-clock';
import {
  isLocalSetId,
  mergePendingSets,
} from '@/features/health/workout-session/lib/pending-set-store';
import {
  draftToSetPayload,
  nextSetDraft,
  type SetDraft,
  toSetDraft,
} from '@/features/health/workout-session/lib/set-drafts';
import { useLiveSetLog } from '@/features/health/workout-session/model/use-live-set-log';
import { useNow } from '@/features/health/workout-session/model/use-now';
import { useRestTimer } from '@/features/health/workout-session/model/use-rest-timer';
import { useRoutineRest } from '@/features/health/workout-session/model/use-routine-rest';
import { useWakeLock } from '@/features/health/workout-session/model/use-wake-lock';
import { useWorkoutSessionMutations } from '@/features/health/workout-session/model/use-workout-session';
import { useRouter } from '@/shared/i18n/navigation';

/** The session clock is read in seconds while a workout is running — it is the
 *  number that answers "have I been here forty minutes or ninety". */
const SESSION_CLOCK_MS = 1_000;

const FIELD_MAX: Record<SetField, number> = {
  weightKg: 9999.99,
  reps: 1000,
  durationSec: 86_400,
  rpe: 10,
};

const FIELD_UNIT_KEY = {
  weightKg: 'unitKg',
  reps: 'unitReps',
  durationSec: 'unitSeconds',
  rpe: 'unitRpe',
} as const satisfies Record<SetField, string>;

/** What a confirmation is standing in front of. One dialog rather than two,
 *  because the question is the same — unsent sets are about to be left behind
 *  — and only the verb differs. */
type PendingGate = 'leave' | 'finish' | null;

/**
 * One measure replaced on a draft.
 *
 * A switch rather than a computed key, because `{ ...draft, [field]: value }`
 * with a union-typed `field` widens the result to a string index signature and
 * stops being assignable to `SetDraft` — the compiler would have to be
 * silenced, and AGENTS §11.2 rules that out.
 */
function withField(draft: SetDraft, field: SetField, value: string): SetDraft {
  switch (field) {
    case 'weightKg':
      return { ...draft, weightKg: value };
    case 'reps':
      return { ...draft, reps: value };
    case 'durationSec':
      return { ...draft, durationSec: value };
    case 'rpe':
      return { ...draft, rpe: value };
  }
}

/**
 * The in-gym logger: an open session, on a phone, one-handed, on a bad signal.
 *
 * **The observation the whole screen is built around is that set N+1 is almost
 * always identical to set N.** Five sets of the same weight and reps is the
 * ordinary case, not the exception. So the primary action is ONE TAP — the
 * inputs arrive pre-filled from the last set of this exercise, and "Log set" is
 * a single press under the thumb — and everything else on the screen is the
 * exception path: the steppers for a plate change, the numpad for a jump, the
 * set rows for a correction. If logging a normal set cost more than one tap the
 * feature would have failed regardless of what else worked.
 *
 * **Nothing here waits on the network.** The set is in the query cache before
 * the request leaves and, if the request fails, in IndexedDB before the reader
 * could notice. The only sign of trouble is a count in the header — there is no
 * error toast in this path at all, because an interruption between sets is an
 * interruption during the one thing the screen exists for, and there is nothing
 * to be done about a basement from inside a gym.
 *
 * **Every duration is derived from a timestamp**, never counted in ticks. A
 * phone in a pocket freezes its timers, so a rest timer that counted callbacks
 * would come back from three minutes reading forty seconds
 * (`use-rest-timer.ts`).
 *
 * The wake lock is what makes this usable rather than merely correct: without
 * it the screen locks between sets and every set costs an unlock with chalky
 * hands.
 *
 * **No clock times on this screen**, which is why it takes no `timeZone` where
 * the review view beside it does. Everything here is an INTERVAL — time in the
 * session, time since the last set — and an interval needs no zone. The moment
 * one of these figures becomes a wall-clock time it will need the
 * server-resolved zone threaded in, for the reason
 * `shared/lib/local-date-format.ts` sets out: formatting in the browser's own
 * zone renders one string on the server and another on the client.
 *
 * **Two modes, one route.** A FINISHED session renders the editable review
 * instead — see `workout-session-view.tsx` for why that branch is data-driven
 * rather than a second URL.
 */
export function WorkoutLiveLogger({
  session: serverSession,
}: {
  session: WorkoutSessionDetail;
}) {
  const t = useTranslations('dashboard.health.workout');
  const tLive = useTranslations('dashboard.health.workout.live');
  const router = useRouter();

  const log = useLiveSetLog(serverSession.id);
  const mutations = useWorkoutSessionMutations(serverSession.id);
  const timer = useRestTimer();
  const restSecFor = useRoutineRest(serverSession.routineId);
  const wakeLock = useWakeLock(true);
  const now = useNow(SESSION_CLOCK_MS);

  const [activeIndex, setActiveIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [numpadField, setNumpadField] = useState<SetField | null>(null);
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isFinishOpen, setFinishOpen] = useState(false);
  const [finishNow, setFinishNow] = useState(() => Date.now());
  const [gate, setGate] = useState<PendingGate>(null);
  const [editing, setEditing] = useState<{
    workoutExerciseId: string;
    draft: SetDraft;
  } | null>(null);

  // What the server has, plus what this browser is still holding. Without the
  // merge a refetch — a reconnect, the stale time expiring — would answer with
  // rows that by definition exclude every queued set, and sets the reader
  // logged would vanish from the list while the header still counted them.
  const session = useMemo(
    () => mergePendingSets(serverSession, log.pending),
    [serverSession, log.pending]
  );

  const exercises = session.exercises;
  // Clamped rather than trusted: an exercise removed elsewhere, or a refetch
  // that returns fewer, must not leave this pointing past the end and render
  // an empty screen.
  const index = Math.min(activeIndex, Math.max(0, exercises.length - 1));
  const exercise = exercises[index];

  const draft =
    exercise === undefined
      ? null
      : // Derived at render rather than seeded by an effect: after a set is
        // logged the last set IS the one just logged, so the next draft
        // recomputes to the same numbers and the repeat costs nothing. An
        // effect would have to decide when to overwrite an edit in progress.
        drafts[exercise.id] ?? nextSetDraft(exercise.sets.at(-1));

  const unsyncedCount = log.pending.length;

  // The browser's own last line of defence. It fires for a reload, a closed tab
  // and a typed URL — none of which the in-app confirmation can intercept. The
  // wording is the browser's; every engine ignores a custom string.
  useEffect(() => {
    if (unsyncedCount === 0) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [unsyncedCount]);

  const logSet = () => {
    if (!exercise || !draft) return;

    log.logSet({
      workoutExerciseId: exercise.id,
      payload: {
        ...draftToSetPayload(draft),
        // Stamped HERE, unlike the post-workout editor which carries
        // `completedAt` through untouched. In live mode "now" is the truth —
        // this is the moment the set ended — and it is what makes the real
        // rest intervals recoverable afterwards. The other path refuses to
        // invent one for a set performed two hours ago; both are the same
        // rule: record when the set finished, or record nothing.
        completedAt: new Date().toISOString(),
      },
    });

    // Auto-started on "set done", from the routine's own interval. This is also
    // the gesture that unlocks audio on iOS, which is why the timer primes the
    // cue in `start` rather than when it expires (`rest-cue.ts`).
    //
    // A routine may name ZERO seconds — a superset, a circuit — and that means
    // "do not rest", not "the rest is already over". Starting on it would beep
    // on the same tap that logged the set.
    const restSec = restSecFor(exercise.exerciseId);
    if (restSec > 0) timer.start(restSec);
    else timer.stop();
  };

  const openFinish = () => {
    setFinishNow(Date.now());
    setFinishOpen(true);
  };

  const numpadLabel =
    numpadField === 'reps'
      ? t('reps')
      : numpadField === 'durationSec'
      ? t('durationSec')
      : numpadField === 'rpe'
      ? t('rpe')
      : exercise?.metric === 'weighted_bodyweight'
      ? t('addedWeight')
      : t('weight');

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <BackToGymLink
          compact
          guard={() => {
            if (unsyncedCount === 0) return true;
            setGate('leave');
            return false;
          }}
        />

        <div className="min-w-0 flex-1">
          <p className="break-safe truncate text-sm font-semibold">
            {session.title}
          </p>
          <p className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            <span>{formatSeconds(elapsedSeconds(session.startedAt, now))}</span>
            {wakeLock.isActive ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{tLive('screenAwake')}</span>
              </>
            ) : null}
          </p>
        </div>

        {/* Icon AND number AND a live region: on a palette with no hue there is
            no amber warning to reach for, and this is the only signal that a
            set has not reached the server. A count rather than a state, so the
            reader can watch it fall as the queue drains. */}
        {unsyncedCount > 0 ? (
          <span
            aria-live="polite"
            className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums"
          >
            {log.isSyncing ? (
              <RefreshCw aria-hidden className="size-3.5 animate-spin" />
            ) : (
              <CloudOff aria-hidden className="size-3.5" />
            )}
            {tLive('unsyncedCount', { n: unsyncedCount })}
          </span>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => (unsyncedCount > 0 ? setGate('finish') : openFinish())}
          disabled={mutations.isFinishing}
          className="h-11 shrink-0 rounded-xl px-3"
        >
          <CircleCheck aria-hidden className="mr-1.5 size-4" />
          {t('finishAction')}
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-8">
          {exercise && draft ? (
            <>
              <LiveExercisePane
                exercise={exercise}
                index={index}
                total={exercises.length}
                onSwipe={(delta) =>
                  setActiveIndex(
                    Math.min(exercises.length - 1, Math.max(0, index + delta))
                  )
                }
                onOpenSwitcher={() => setSwitcherOpen(true)}
                onEditSet={(set: WorkoutSetRow) =>
                  setEditing({
                    workoutExerciseId: exercise.id,
                    draft: toSetDraft(set),
                  })
                }
              />

              <LiveSetInputs
                draft={draft}
                metric={exercise.metric}
                equipment={exercise.equipment}
                onChange={(next) =>
                  setDrafts((current) => ({ ...current, [exercise.id]: next }))
                }
                onOpenNumpad={setNumpadField}
              />
            </>
          ) : (
            <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow">
              <p className="text-sm text-muted-foreground">
                {t('noExercises')}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPickerOpen(true)}
                className="h-12 w-full rounded-2xl"
              >
                {t('addExercise')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Outside the scroll area, so the primary action is under the thumb on
          every frame however far the set list has scrolled, and clear of the
          iOS home indicator. */}
      <div className="shrink-0 border-t bg-background px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          <RestTimerBar timer={timer} />

          <Button
            type="button"
            onClick={logSet}
            disabled={!exercise}
            className="h-16 w-full rounded-2xl text-base"
          >
            <Check aria-hidden className="mr-2 size-5" />
            {tLive('logSet')}
          </Button>
        </div>
      </div>

      <ExerciseSwitchSheet
        open={isSwitcherOpen}
        onOpenChange={setSwitcherOpen}
        exercises={exercises}
        activeIndex={index}
        onSelect={setActiveIndex}
        onAddExercise={() => setPickerOpen(true)}
      />

      <ExercisePickerModal
        open={isPickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(picked) =>
          // Straight to the exercise that was just added: it is the one the
          // reader is about to perform, and the alternative is adding it and
          // then having to find it.
          mutations.addExercise(picked.id, {
            onSuccess: () => setActiveIndex(exercises.length),
          })
        }
      />

      {exercise && draft && numpadField ? (
        <NumpadSheet
          open
          onOpenChange={(next) => {
            if (!next) setNumpadField(null);
          }}
          label={numpadLabel}
          unit={tLive(FIELD_UNIT_KEY[numpadField])}
          initial={draft[numpadField]}
          min={0}
          max={FIELD_MAX[numpadField]}
          allowDecimal={numpadField === 'weightKg' || numpadField === 'rpe'}
          onSubmit={(value) =>
            setDrafts((current) => ({
              ...current,
              [exercise.id]: withField(draft, numpadField, value),
            }))
          }
        />
      ) : null}

      {/* Correcting a set already logged is the exception path, and it reuses
          the post-workout editor rather than growing a second one: that modal
          already knows which fields each metric takes, and a correction made
          in the gym is the same write as one made at home.

          A set still in the QUEUE is the one case it cannot be: its id is
          local, and `updateWorkoutSet` addressed to one would 404 against a
          row the server has never heard of. Those corrections are applied to
          the queued record instead, and the next drain sends the corrected
          numbers. */}
      {editing ? (
        <SetEditorModal
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          initial={editing.draft}
          metric={exercise?.metric ?? ''}
          exerciseName={exercise?.exerciseName ?? ''}
          isSaving={mutations.isSavingSet}
          onSubmit={(next) => {
            const id = editing.draft.id;

            if (id && isLocalSetId(id)) {
              log.editQueued(id, draftToSetPayload(next));
              setEditing(null);
              return;
            }

            mutations.saveSet(
              { draft: next, workoutExerciseId: editing.workoutExerciseId },
              { onSuccess: () => setEditing(null) }
            );
          }}
          onDelete={
            editing.draft.id
              ? () => {
                  const id = editing.draft.id;
                  if (!id) return;

                  if (isLocalSetId(id)) log.dropQueued(id);
                  else mutations.removeSet(id);

                  setEditing(null);
                }
              : undefined
          }
        />
      ) : null}

      <FinishWorkoutModal
        open={isFinishOpen}
        onOpenChange={setFinishOpen}
        initialNotes={session.notes ?? ''}
        summary={<FinishSummary session={session} now={finishNow} />}
        isSaving={mutations.isFinishing}
        onSubmit={(input) =>
          mutations.finish(input, { onSuccess: () => setFinishOpen(false) })
        }
      />

      <ConfirmDeleteDialog
        isOpen={gate !== null}
        onClose={() => setGate(null)}
        onConfirm={() => {
          const intent = gate;
          setGate(null);

          if (intent === 'leave') router.push('/space/health/gym');
          else openFinish();
        }}
        title={tLive('unsyncedTitle')}
        description={tLive('unsyncedHint', { n: unsyncedCount })}
        actionText={
          gate === 'finish' ? t('finishAction') : tLive('leaveAnyway')
        }
        cancelText={t('cancel')}
      />
    </div>
  );
}
