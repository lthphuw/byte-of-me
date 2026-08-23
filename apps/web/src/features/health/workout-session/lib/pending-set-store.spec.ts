import { afterEach, describe, expect, it } from 'bun:test';

import {
  __resetPendingSetStore,
  deletePendingSet,
  isLocalSetId,
  listPendingSets,
  newLocalSetId,
  type PendingSet,
  queuePendingSet,
} from './pending-set-store';

/**
 * happy-dom ships no IndexedDB at all — `typeof indexedDB` is `undefined` under
 * this preload, which the note editor's spec establishes by probe rather than
 * by assumption. That makes this file a test of the exact environment the
 * queue has to survive: a browser that will not open a database.
 *
 * The contract is that it degrades, never throws. This runs inside the tap that
 * logs a set, and a rejected promise there would surface as an unhandled
 * rejection in the middle of a workout — the one path the whole feature exists
 * to keep quiet.
 */
const record: PendingSet = {
  id: 'local:test',
  sessionId: 'session-1',
  workoutExerciseId: 'we-1',
  queuedAt: 1,
  payload: {
    reps: 5,
    weightKg: 100,
    rpe: null,
    durationSec: null,
    isWarmup: false,
    completedAt: null,
  },
};

afterEach(() => {
  __resetPendingSetStore();
});

describe('the pending-set store without IndexedDB', () => {
  it('reports that a set could not be stored rather than throwing', async () => {
    expect(await queuePendingSet(record)).toBe(false);
  });

  it('reads back an empty queue rather than throwing', async () => {
    expect(await listPendingSets('session-1')).toEqual([]);
  });

  it('resolves a delete for a record it never held', async () => {
    expect(await deletePendingSet('local:test')).toBeUndefined();
  });
});

describe('local set ids', () => {
  it('are distinguishable from the cuids the server returns', () => {
    // The two share a field on `WorkoutSetRow`, and confusing them is what
    // sends an update to a row the server has never heard of.
    expect(isLocalSetId(newLocalSetId())).toBe(true);
    expect(isLocalSetId('cm3x8k2p40001abcdefghijkl')).toBe(false);
  });

  it('are unique per set, so two logged in the same second do not collide', () => {
    expect(newLocalSetId()).not.toBe(newLocalSetId());
  });
});
