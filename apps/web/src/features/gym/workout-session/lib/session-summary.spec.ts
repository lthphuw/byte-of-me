import { describe, expect, it } from 'bun:test';

import { summariseSession } from './session-summary';

import type {
  WorkoutExerciseRow,
  WorkoutSessionDetail,
  WorkoutSetRow,
} from '@/entities/workout';

function set(partial: Partial<WorkoutSetRow>): WorkoutSetRow {
  return {
    id: 'set',
    position: 0,
    reps: null,
    weightKg: null,
    rpe: null,
    durationSec: null,
    isWarmup: false,
    completedAt: null,
    ...partial,
  };
}

function exercise(partial: Partial<WorkoutExerciseRow>): WorkoutExerciseRow {
  return {
    id: 'we-1',
    position: 0,
    notes: null,
    exerciseId: 'ex-1',
    exerciseName: 'Bench press',
    primaryMuscle: 'chest',
    equipment: 'barbell',
    metric: 'weight_reps',
    sets: [],
    ...partial,
  };
}

function session(exercises: WorkoutExerciseRow[]): WorkoutSessionDetail {
  return {
    id: 'session-1',
    localDate: '2026-08-23',
    startedAt: '2026-08-23T09:00:00.000Z',
    endedAt: null,
    title: 'Push day',
    notes: null,
    sessionRpe: null,
    routineId: null,
    exercises,
  };
}

describe('summariseSession', () => {
  it('keeps warm-ups out of volume and out of the working-set count', () => {
    const summary = summariseSession(
      session([
        exercise({
          sets: [
            set({ id: 'a', weightKg: 60, reps: 5, isWarmup: true }),
            set({ id: 'b', weightKg: 100, reps: 5 }),
          ],
        }),
      ])
    );

    expect(summary.workingSetCount).toBe(1);
    expect(summary.totalSetCount).toBe(2);
    expect(summary.volume.loadKg).toBe(500);
  });

  it('keeps belt-loaded work apart from barbell tonnage', () => {
    // 20 kg on a dip belt supplements an unmeasured body mass; folding it into
    // the tonnage would make one number mean two things.
    const summary = summariseSession(
      session([
        exercise({ sets: [set({ id: 'a', weightKg: 100, reps: 5 })] }),
        exercise({
          id: 'we-2',
          exerciseId: 'ex-2',
          exerciseName: 'Weighted dip',
          metric: 'weighted_bodyweight',
          sets: [set({ id: 'b', weightKg: 20, reps: 8 })],
        }),
      ])
    );

    expect(summary.volume.loadKg).toBe(500);
    expect(summary.volume.addedLoadKg).toBe(160);
    expect(summary.volume.bodyweightReps).toBe(8);
  });

  it('counts only the exercises that were actually performed', () => {
    const summary = summariseSession(
      session([
        exercise({ sets: [set({ id: 'a', weightKg: 100, reps: 5 })] }),
        exercise({ id: 'we-2', exerciseId: 'ex-2', sets: [] }),
      ])
    );

    expect(summary.performedExerciseCount).toBe(1);
  });

  it('reports the heaviest working set per exercise, breaking ties on reps', () => {
    const summary = summariseSession(
      session([
        exercise({
          sets: [
            set({ id: 'a', weightKg: 100, reps: 3 }),
            set({ id: 'b', weightKg: 100, reps: 5 }),
            set({ id: 'c', weightKg: 120, reps: 5, isWarmup: true }),
          ],
        }),
      ])
    );

    expect(summary.bestSets).toHaveLength(1);
    expect(summary.bestSets[0]).toMatchObject({
      exerciseName: 'Bench press',
      weightKg: 100,
      reps: 5,
    });
    // Epley: 100 × (1 + 5/30).
    expect(summary.bestSets[0]?.e1rmKg).toBeCloseTo(116.67, 2);
  });

  it('reports no best set for a metric where kilos are not the load', () => {
    const summary = summariseSession(
      session([
        exercise({
          metric: 'bodyweight_reps',
          sets: [set({ id: 'a', reps: 12 })],
        }),
        exercise({
          id: 'we-2',
          exerciseId: 'ex-2',
          metric: 'time',
          sets: [set({ id: 'b', durationSec: 60 })],
        }),
      ])
    );

    expect(summary.bestSets).toEqual([]);
    expect(summary.volume.bodyweightReps).toBe(12);
    expect(summary.volume.timeSec).toBe(60);
  });

  it('drops an exercise whose vocabulary code cannot be typed', () => {
    // A hand-edited row with an unknown metric would otherwise select the
    // wrong volume formula and produce a wrong NUMBER rather than an error.
    const summary = summariseSession(
      session([
        exercise({
          metric: 'isometric_hold',
          sets: [set({ id: 'a', reps: 5, weightKg: 100 })],
        }),
      ])
    );

    expect(summary.volume.loadKg).toBe(0);
    expect(summary.workingSetCount).toBe(0);
    // Still counted as performed: the row exists and has sets on it, whatever
    // the statistics can make of them.
    expect(summary.totalSetCount).toBe(1);
  });
});
