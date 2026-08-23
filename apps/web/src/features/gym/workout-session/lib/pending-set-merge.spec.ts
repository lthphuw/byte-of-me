import { describe, expect, it } from 'bun:test';

import { mergePendingSets, type PendingSet } from './pending-set-store';

import type { WorkoutSessionDetail } from '@/entities/workout';

function pendingSet(partial: Partial<PendingSet>): PendingSet {
  return {
    id: 'local:1',
    sessionId: 'session-1',
    workoutExerciseId: 'we-1',
    queuedAt: 1,
    payload: {
      reps: 5,
      weightKg: 100,
      rpe: null,
      durationSec: null,
      isWarmup: false,
      completedAt: '2026-08-23T09:10:00.000Z',
    },
    ...partial,
  };
}

function session(sets: WorkoutSessionDetail['exercises'][number]['sets']) {
  return {
    id: 'session-1',
    localDate: '2026-08-23',
    startedAt: '2026-08-23T09:00:00.000Z',
    endedAt: null,
    title: 'Push day',
    notes: null,
    sessionRpe: null,
    routineId: null,
    exercises: [
      {
        id: 'we-1',
        position: 0,
        notes: null,
        exerciseId: 'ex-1',
        exerciseName: 'Bench press',
        primaryMuscle: 'chest',
        equipment: 'barbell',
        metric: 'weight_reps',
        sets,
      },
    ],
  } satisfies WorkoutSessionDetail;
}

const storedSet = {
  id: 'set-1',
  position: 0,
  reps: 5,
  weightKg: 100,
  rpe: null,
  durationSec: null,
  isWarmup: false,
  completedAt: null,
};

describe('mergePendingSets', () => {
  it('puts a queued set back on screen after a refetch dropped it', () => {
    // The server answer cannot contain a set the server never received, so
    // without this the set the reader logged would vanish from the list.
    const merged = mergePendingSets(session([storedSet]), [pendingSet({})]);

    expect(merged.exercises[0]?.sets.map((set) => set.id)).toEqual([
      'set-1',
      'local:1',
    ]);
  });

  it('numbers the merged sets on from the stored ones', () => {
    const merged = mergePendingSets(session([storedSet]), [
      pendingSet({ id: 'local:2', queuedAt: 2 }),
      pendingSet({ id: 'local:1', queuedAt: 1 }),
    ]);

    expect(merged.exercises[0]?.sets.map((set) => set.position)).toEqual([
      0, 1, 2,
    ]);
    // Oldest first: the order they were performed in, not the order the queue
    // happened to be read back in.
    expect(merged.exercises[0]?.sets.map((set) => set.id)).toEqual([
      'set-1',
      'local:1',
      'local:2',
    ]);
  });

  it('adds nothing when the optimistic row is already in the cache', () => {
    const optimistic = { ...storedSet, id: 'local:1' };
    const merged = mergePendingSets(session([optimistic]), [pendingSet({})]);

    expect(merged.exercises[0]?.sets).toHaveLength(1);
  });

  it('leaves an exercise the queue holds nothing for untouched', () => {
    const before = session([storedSet]);
    const merged = mergePendingSets(before, [
      pendingSet({ workoutExerciseId: 'we-other' }),
    ]);

    expect(merged.exercises[0]).toBe(before.exercises[0]);
  });

  it('returns the session itself when the queue is empty', () => {
    const before = session([storedSet]);

    expect(mergePendingSets(before, [])).toBe(before);
  });
});
