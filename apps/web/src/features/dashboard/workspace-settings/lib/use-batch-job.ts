'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { BatchJobInput, BatchJobProgress } from '@/entities/note';
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
      }
    })();
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL as BatchJobState<Extra>);
  }, []);

  return { state, start, cancel, reset };
}
