'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  type BatchJobInput,
  type BatchJobProgress,
  noteKeys,
} from '@/entities/note';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Drives a whole-vault job from the client, one bounded batch at a time.
 *
 * ## Why the loop lives here and not on the server
 *
 * The author asked for these to run in the background with a real progress
 * bar, and a server action cannot report progress: it returns once. The
 * alternatives were a job runner with a status table to poll, or this — the
 * client asks for 25 notes' worth of work, draws what came back, and asks
 * again. No new infrastructure, and the progress is a count of rows actually
 * processed rather than an animation standing in for one.
 *
 * It is also what makes the job **cancellable** and what keeps it from blocking
 * anything. Each call is a bounded unit of server work, so the Node process is
 * never held; between calls the browser is completely free; and `cancel` simply
 * stops asking, leaving every batch that already committed committed.
 */
export type BatchJobStatus =
  | 'idle'
  | 'running'
  | 'done'
  | 'cancelled'
  | 'error';

export interface BatchJobState<Extra> {
  status: BatchJobStatus;
  /** Rows in scope, as of the last batch. */
  total: number;
  /** Rows examined so far, across every batch of this run. */
  processed: number;
  /** Rows actually changed so far. */
  changed: number;
  errorMsg?: string;
  /** Whatever the batches collected beyond the counters — the audit's rows. */
  collected: Extra[];
}

/**
 * How many jobs are running anywhere in the workspace.
 *
 * A module-scoped store rather than a context, because the only thing that
 * needs the answer — the settings dialog's "you are about to kill this" close
 * guard — sits ABOVE the panel that owns the jobs, with a component in between
 * that neither creates them nor should have to forward them. There is exactly
 * one settings dialog on the page.
 */
let runningJobs = 0;
const runningJobListeners = new Set<() => void>();

function setRunningJobs(delta: number) {
  runningJobs += delta;
  for (const listener of runningJobListeners) listener();
}

function subscribeToRunningJobs(listener: () => void) {
  runningJobListeners.add(listener);
  return () => {
    runningJobListeners.delete(listener);
  };
}

/** True while any batch job is mid-run. Closing the dialog would cancel it. */
export function useHasRunningBatchJob(): boolean {
  return useSyncExternalStore(
    subscribeToRunningJobs,
    () => runningJobs > 0,
    () => false
  );
}

const INITIAL: BatchJobState<never> = {
  status: 'idle',
  total: 0,
  processed: 0,
  changed: 0,
  collected: [],
};

export function useBatchJob<Batch extends BatchJobProgress, Extra = never>(
  runBatch: (input: BatchJobInput) => Promise<ApiResponse<Batch>>,
  options?: {
    /**
     * Pulls the collectable rows out of a batch, for a job that REPORTS as well
     * as counts. Generic over the batch shape so the audit job's `stale` array
     * arrives typed rather than through a cast — the counters are common to
     * every job, the payload is not.
     */
    collect?: (batch: Batch) => Extra[];
  }
) {
  const [state, setState] = useState<BatchJobState<Extra>>(
    INITIAL as BatchJobState<Extra>
  );
  const queryClient = useQueryClient();

  /**
   * Set by `cancel`, read by the loop between batches.
   *
   * A ref, not state: the loop is an async function that has already closed
   * over its scope, so a state value would be whatever it was when the run
   * started and cancellation would never be seen.
   */
  const cancelledRef = useRef(false);
  /** Guards a second `start` while one is still going. */
  const runningRef = useRef(false);
  /**
   * False once the component is gone. A job that outlives its dialog must stop
   * calling `setState` — and, more importantly, must stop making requests
   * nobody will ever see the result of.
   *
   * "Gone" used to include SWITCHING TABS: Radix unmounts the panel that is
   * leaving, so glancing at Appearance mid-run killed the job silently and
   * threw the progress away. The maintenance panel is `forceMount`ed for that
   * reason — see `workspace-settings-dialog.tsx`.
   */
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelledRef.current = true;
    };
  }, []);

  const collectRef = useRef(options?.collect);
  collectRef.current = options?.collect;

  const runBatchRef = useRef(runBatch);
  runBatchRef.current = runBatch;

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    cancelledRef.current = false;
    setRunningJobs(1);

    setState({
      status: 'running',
      total: 0,
      processed: 0,
      changed: 0,
      collected: [],
    });

    void (async () => {
      let cursor: string | null = null;

      try {
        // Bounded by the server's own cursor: the loop ends when a batch says
        // there is nothing after it. There is no iteration cap here because a
        // cap would silently stop halfway through a large vault and report
        // success — the cursor reaching null is the only honest end.
        for (;;) {
          if (cancelledRef.current) {
            if (mountedRef.current) {
              setState((s) => ({ ...s, status: 'cancelled' }));
            }
            return;
          }

          const result = await runBatchRef.current({ cursor });

          if (!result.success) {
            if (mountedRef.current) {
              setState((s) => ({
                ...s,
                status: 'error',
                errorMsg: result.errorMsg,
              }));
            }
            return;
          }

          const batch = result.data;
          const extra = collectRef.current?.(batch) ?? [];

          if (!mountedRef.current) return;

          setState((s) => ({
            ...s,
            // `total` is re-read every batch rather than latched from the
            // first: notes can be created or deleted while the job runs, and a
            // denominator frozen at the start would drift past 100%.
            total: batch.total,
            processed: s.processed + batch.processed,
            changed: s.changed + batch.changed,
            collected:
              extra.length > 0 ? [...s.collected, ...extra] : s.collected,
          }));

          cursor = batch.nextCursor;
          if (cursor === null) {
            setState((s) => ({ ...s, status: 'done' }));
            // A finished job has rewritten rows the client is still caching:
            // the link-graph rebuild changes every backlink list and the whole
            // graph, the search rebuild changes what `searchNotes` returns.
            // Without this the workspace served pre-rebuild answers for the
            // rest of the session — the one state where "I just repaired it"
            // and "it is still broken" look identical.
            //
            // Unconditional, including for the stale-link AUDIT, which writes
            // nothing: its `changed` counts notes it FOUND, so there is no
            // honest flag here to skip on, and three refetches once per manual
            // run is cheaper than an option every future job would forget.
            void queryClient.invalidateQueries({
              queryKey: noteKeys.linksAll(),
            });
            void queryClient.invalidateQueries({ queryKey: noteKeys.graph() });
            void queryClient.invalidateQueries({
              queryKey: noteKeys.searchAll(),
            });
            // `detailAll` because one job — `stripNotePresentation` — rewrites
            // the DOCUMENTS, not just data derived from them. Without this, a
            // note whose detail is still cached from before the run would open
            // with the pre-strip body and the autosave would write it straight
            // back, silently undoing the job. Unconditional for the reason
            // above; for the other two jobs the refetch returns the row it
            // already had, so nothing reseeds.
            void queryClient.invalidateQueries({
              queryKey: noteKeys.detailAll(),
            });
            return;
          }
        }
      } catch (error) {
        if (mountedRef.current) {
          setState((s) => ({
            ...s,
            status: 'error',
            errorMsg: String(error),
          }));
        }
      } finally {
        runningRef.current = false;
        setRunningJobs(-1);
      }
    })();
  }, [queryClient]);

  const reset = useCallback(() => {
    setState(INITIAL as BatchJobState<Extra>);
  }, []);

  return { state, start, cancel, reset };
}
