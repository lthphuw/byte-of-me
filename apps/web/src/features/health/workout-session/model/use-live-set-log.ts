'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  addWorkoutSet,
  workoutKeys,
  type WorkoutSessionDetail,
  type WorkoutSetRow,
} from '@/entities/workout';
import {
  deletePendingSet,
  listPendingSets,
  newLocalSetId,
  type PendingSet,
  queuePendingSet,
} from '@/features/health/workout-session/lib/pending-set-store';
import type { SetPayload } from '@/features/health/workout-session/lib/set-drafts';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * How long a set write may stay in flight before it is ALSO written to the
 * durable queue.
 *
 * A bad signal does not usually produce a failure — it produces a request that
 * never resolves. `catch` never runs for that, so a queue armed only on
 * rejection would hold nothing while the one case it exists for is happening,
 * and the set would be lost the moment the tab was closed.
 *
 * Twenty seconds because the two failure modes are asymmetric and the choice is
 * between them. Queue too eagerly and a slow-but-successful write can be
 * replayed, leaving a duplicate set — visible on screen, and deletable in two
 * taps. Never queue and the set is lost with no trace at all, on a screen still
 * showing it as logged. A visible, fixable duplicate beats a silent loss. The
 * in-flight bookkeeping below narrows the window further: a late success
 * unqueues the record it timed out into, and a drain skips anything still in
 * flight, so a duplicate needs the request to land in the seconds between a
 * reconnect firing and the late response arriving.
 */
const SEND_TIMEOUT_MS = 20_000;

export interface LiveSetLog {
  /** Logs one set. Returns immediately — the UI never waits on the network. */
  logSet: (input: { workoutExerciseId: string; payload: SetPayload }) => void;
  /**
   * Corrects a set that is still in the queue.
   *
   * A queued set has a LOCAL id, and `updateWorkoutSet` addressed to one would
   * 404 — the server has never heard of it. So a correction made before the
   * set has synced has to be applied to the record instead, and the corrected
   * payload is what the next drain sends.
   */
  editQueued: (id: string, payload: SetPayload) => void;
  /** Drops a queued set entirely — the delete path for the same case. */
  dropQueued: (id: string) => void;
  /** Sets this browser is holding that the server has not accepted. Rendered
   *  as the header chip, and merged into the set lists so an unsynced set is
   *  still visible after a reload. */
  pending: PendingSet[];
  /** True while a drain is working through the queue. */
  isSyncing: boolean;
}

/**
 * Logging a set, on a signal that may not be there.
 *
 * **The UI never waits on the network, and never interrupts a set to report
 * it.** The tap is the whole interaction — the optimistic row is in the query
 * cache before the request leaves, and a failure changes nothing on screen
 * except a count in the header. There is no error toast in this path on
 * purpose: a modal or a toast landing between sets is an interruption during
 * the one activity the screen exists for, and there is nothing the reader could
 * do about it in a basement anyway.
 *
 * Three places hold a set, and each covers a failure the others do not:
 *
 *  - the **query cache**, so the set is on screen instantly and every count
 *    reading that key agrees with it;
 *  - **IndexedDB**, so it survives a reload, a discarded tab, and the walk to
 *    the car;
 *  - **this hook's state**, so a refetch of the session — which returns rows
 *    the server has, and therefore not these — cannot make a logged set vanish
 *    from the list. `mergePendingSets` is what puts them back.
 *
 * The queue drains on mount, on every `online` event, and after every
 * successful write. Mount matters as much as the event, for the reason
 * `use-note-sync-queue.ts` gives: the usual way a failed write is noticed is
 * that the reader comes back later and reopens the app, long after `online`
 * fired and was missed.
 */
export function useLiveSetLog(sessionId: string): LiveSetLog {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingSet[]>([]);
  const [isSyncing, setSyncing] = useState(false);

  // Read inside the drain rather than closed over, so a set logged WHILE a
  // drain is running is picked up by the remaining iterations instead of being
  // skipped until the next event.
  const pendingRef = useRef<PendingSet[]>([]);
  pendingRef.current = pending;

  // Ids whose request is still open. A drain must not replay one of these: the
  // request may yet land, and replaying it is the only way this hook can
  // produce a duplicate.
  const inFlight = useRef(new Set<string>());
  const isDraining = useRef(false);

  const patchSession = useCallback(
    (patch: (session: WorkoutSessionDetail) => WorkoutSessionDetail) => {
      queryClient.setQueryData<ApiResponse<WorkoutSessionDetail | null>>(
        workoutKeys.detail(sessionId),
        (current) => {
          if (!current?.success || !current.data) return current;
          return { success: true, data: patch(current.data) };
        }
      );
    },
    [queryClient, sessionId]
  );

  /** Swaps the optimistic row for the one the server wrote, in place, so the
   *  set keeps its position in the list rather than jumping to the end. */
  const acceptRow = useCallback(
    (localId: string, row: WorkoutSetRow) => {
      patchSession((session) => ({
        ...session,
        exercises: session.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) => (set.id === localId ? row : set)),
        })),
      }));
    },
    [patchSession]
  );

  const forget = useCallback((localId: string) => {
    setPending((current) => current.filter((row) => row.id !== localId));
  }, []);

  /**
   * Sends one set. Resolves `true` when the server accepted it.
   *
   * `onTimeout` is called rather than returned, because the point of the
   * timeout is to act while the request is still open — the promise this
   * returns keeps waiting for the real answer, and a late success is what
   * takes the queued record back out again.
   */
  const send = useCallback(
    async (record: PendingSet, onTimeout?: () => void): Promise<boolean> => {
      inFlight.current.add(record.id);

      const timer = onTimeout
        ? window.setTimeout(onTimeout, SEND_TIMEOUT_MS)
        : null;

      try {
        const res = await addWorkoutSet({
          workoutExerciseId: record.workoutExerciseId,
          ...record.payload,
        });

        if (!res.success) return false;

        acceptRow(record.id, res.data);
        // Whether or not it was ever queued: a late success has to undo the
        // timeout's precaution, or the set is written twice.
        void deletePendingSet(record.id);
        forget(record.id);

        // The gym screen's start panel counts this session's exercises and
        // sets. Every write here changes that count, and it is the one key
        // outside this screen that would otherwise go stale (AGENTS §6).
        void queryClient.invalidateQueries({ queryKey: workoutKeys.open() });

        return true;
      } catch {
        // Offline, a dead socket, a session that expired — all of them arrive
        // here, and none of them is worth a toast mid-set.
        return false;
      } finally {
        if (timer !== null) window.clearTimeout(timer);
        inFlight.current.delete(record.id);
      }
    },
    [acceptRow, forget, queryClient]
  );

  const drain = useCallback(async () => {
    if (isDraining.current) return;

    const queued = pendingRef.current.filter(
      (record) => !inFlight.current.has(record.id)
    );
    if (queued.length === 0) return;

    isDraining.current = true;
    setSyncing(true);

    try {
      // Oldest first. `addWorkoutSet` derives `position` from the current set
      // count, so replaying out of order renumbers the workout: set 3 arriving
      // before set 2 lands as set 2, and the two are swapped in every later
      // reading of the session.
      for (const record of [...queued].sort(
        (a, b) => a.queuedAt - b.queuedAt
      )) {
        // Stop at the FIRST failure rather than pressing on. The overwhelming
        // likelihood is that the network is still down, in which case every
        // remaining set fails the same way and each attempt is a full server
        // action. They stay queued and the next event tries again.
        if (!(await send(record))) break;
      }
    } finally {
      isDraining.current = false;
      setSyncing(false);
    }
  }, [send]);

  const logSet = useCallback(
    ({
      workoutExerciseId,
      payload,
    }: {
      workoutExerciseId: string;
      payload: SetPayload;
    }) => {
      const record: PendingSet = {
        id: newLocalSetId(),
        sessionId,
        workoutExerciseId,
        payload,
        queuedAt: Date.now(),
      };

      // On screen first, before anything touches the network. `position` is
      // the count this exercise already has, which is exactly what the server
      // will assign — so the optimistic row and the row that comes back agree
      // rather than reordering the list when they swap.
      patchSession((session) => ({
        ...session,
        exercises: session.exercises.map((exercise) =>
          exercise.id === workoutExerciseId
            ? {
                ...exercise,
                sets: [
                  ...exercise.sets,
                  {
                    id: record.id,
                    position: exercise.sets.length,
                    ...payload,
                  },
                ],
              }
            : exercise
        ),
      }));

      const hold = () => {
        // Held in BOTH places, and neither is redundant: IndexedDB survives the
        // page, state survives a refetch of the session. A browser that refuses
        // to open a database still gets the second one.
        void queuePendingSet(record);
        setPending((current) =>
          current.some((row) => row.id === record.id)
            ? current
            : [...current, record]
        );
      };

      void send(record, hold).then((sent) => {
        if (!sent) hold();
        // A success is the best evidence available that the network is back,
        // and it costs nothing when the queue is empty.
        else void drain();
      });
    },
    [drain, patchSession, send, sessionId]
  );

  const editQueued = useCallback(
    (id: string, payload: SetPayload) => {
      setPending((current) => {
        const next = current.map((record) =>
          record.id === id ? { ...record, payload } : record
        );

        // Written back to disk from the mapped list rather than read again:
        // the record has to survive a reload carrying the CORRECTION, or the
        // queue would replay the number that was wrong.
        const updated = next.find((record) => record.id === id);
        if (updated) void queuePendingSet(updated);

        return next;
      });

      patchSession((session) => ({
        ...session,
        exercises: session.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) =>
            set.id === id ? { ...set, ...payload } : set
          ),
        })),
      }));
    },
    [patchSession]
  );

  const dropQueued = useCallback(
    (id: string) => {
      void deletePendingSet(id);
      forget(id);

      patchSession((session) => ({
        ...session,
        exercises: session.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.filter((set) => set.id !== id),
        })),
      }));
    },
    [forget, patchSession]
  );

  // What this browser was already holding when the screen opened. The state
  // starts empty, so the record on disk is the only evidence a set logged
  // before a reload was ever performed.
  useEffect(() => {
    let cancelled = false;

    void listPendingSets(sessionId).then((stored) => {
      if (cancelled || stored.length === 0) return;

      setPending((current) => {
        const known = new Set(current.map((row) => row.id));
        return [...current, ...stored.filter((row) => !known.has(row.id))];
      });
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  /**
   * Drains whenever there is something to drain and a network to do it over.
   *
   * Keyed on the LENGTH rather than run once on mount, because the mount drain
   * would fire before the IndexedDB read above resolves and find an empty
   * queue — which is exactly the case this recovery exists for: the usual way
   * a failed write is noticed is that the reader comes back later and reopens
   * the app, long after `online` fired and was missed
   * (`use-note-sync-queue.ts` makes the same point about mount).
   *
   * Chaining falls out of the same key: a successful replay shortens the queue,
   * which re-runs this, which sends the next one. A failure leaves the length
   * where it was, so a dead network costs one attempt and then waits for
   * `online` rather than spinning.
   */
  useEffect(() => {
    if (pending.length === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    void drain();
  }, [pending.length, drain]);

  useEffect(() => {
    const run = () => void drain();

    window.addEventListener('online', run);
    return () => window.removeEventListener('online', run);
  }, [drain]);

  return { logSet, editQueued, dropQueued, pending, isSyncing };
}
