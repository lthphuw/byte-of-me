/**
 * What this spec defends: a set and an exercise inside a session are reachable
 * ONLY through a session the caller owns. Neither table carries an `ownerId` —
 * a `WorkoutSet` hangs off a `WorkoutExercise` which hangs off a
 * `WorkoutSession` — so every read and write here has to traverse the relation
 * to prove ownership, and a cuid is the only other thing standing in the way.
 * Also: positions are assigned by the server, `Decimal` columns come back as
 * numbers, and failures surface through `errorMsg`.
 */
import { Prisma, prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as AddExerciseModule from './add-workout-exercise';
import type * as AddSetModule from './add-workout-set';
import type * as DeleteSetModule from './delete-workout-set';
import type * as RemoveExerciseModule from './remove-workout-exercise';
import type * as ReorderModule from './reorder-workout-exercises';
import type * as UpdateSetModule from './update-workout-set';

let addWorkoutSet: typeof AddSetModule.addWorkoutSet;
let updateWorkoutSet: typeof UpdateSetModule.updateWorkoutSet;
let deleteWorkoutSet: typeof DeleteSetModule.deleteWorkoutSet;
let addWorkoutExercise: typeof AddExerciseModule.addWorkoutExercise;
let reorderWorkoutExercises: typeof ReorderModule.reorderWorkoutExercises;
let removeWorkoutExercise: typeof RemoveExerciseModule.removeWorkoutExercise;

beforeAll(async () => {
  ({ addWorkoutSet } = await import('./add-workout-set'));
  ({ updateWorkoutSet } = await import('./update-workout-set'));
  ({ deleteWorkoutSet } = await import('./delete-workout-set'));
  ({ addWorkoutExercise } = await import('./add-workout-exercise'));
  ({ reorderWorkoutExercises } = await import('./reorder-workout-exercises'));
  ({ removeWorkoutExercise } = await import('./remove-workout-exercise'));
});

const setCreate = mock();
const setFindFirst = mock();
const setUpdateMany = mock();
const setDeleteMany = mock();
Object.defineProperty(prisma, 'workoutSet', {
  value: {
    create: setCreate,
    findFirst: setFindFirst,
    updateMany: setUpdateMany,
    deleteMany: setDeleteMany,
  },
  writable: true,
  configurable: true,
});

const weFindFirst = mock();
const weFindMany = mock();
const weCreate = mock();
const weUpdateMany = mock();
const weDeleteMany = mock();
Object.defineProperty(prisma, 'workoutExercise', {
  value: {
    findFirst: weFindFirst,
    findMany: weFindMany,
    create: weCreate,
    updateMany: weUpdateMany,
    deleteMany: weDeleteMany,
  },
  writable: true,
  configurable: true,
});

const sessionFindFirst = mock();
Object.defineProperty(prisma, 'workoutSession', {
  value: { findFirst: sessionFindFirst },
  writable: true,
  configurable: true,
});

const exerciseCount = mock();
Object.defineProperty(prisma, 'exercise', {
  value: { count: exerciseCount },
  writable: true,
  configurable: true,
});

const transaction = mock();
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
  writable: true,
  configurable: true,
});

const storedSet = {
  id: 'set-1',
  position: 2,
  reps: 8,
  weightKg: new Prisma.Decimal('102.50'),
  rpe: new Prisma.Decimal('8.5'),
  durationSec: null,
  isWarmup: false,
  completedAt: new Date('2026-08-22T11:35:00.000Z'),
};

const storedWorkoutExercise = {
  id: 'we-9',
  position: 3,
  notes: null,
  exerciseId: 'ex-1',
  exercise: {
    name: 'Bench Press',
    primaryMuscle: 'chest',
    equipment: 'barbell',
    metric: 'weight_reps',
  },
  sets: [],
};

const validSet = {
  workoutExerciseId: 'we-1',
  reps: 8,
  weightKg: 102.5,
  rpe: 8.5,
  isWarmup: false,
  completedAt: '2026-08-22T11:35:00.000Z',
};

beforeEach(() => {
  setCreate.mockReset().mockResolvedValue(storedSet);
  setFindFirst.mockReset().mockResolvedValue(storedSet);
  setUpdateMany.mockReset().mockResolvedValue({ count: 1 });
  setDeleteMany.mockReset().mockResolvedValue({ count: 1 });
  weFindFirst
    .mockReset()
    .mockResolvedValue({ id: 'we-1', _count: { sets: 2 } });
  weFindMany
    .mockReset()
    .mockResolvedValue([{ id: 'we-1' }, { id: 'we-2' }, { id: 'we-3' }]);
  weCreate.mockReset().mockResolvedValue(storedWorkoutExercise);
  weUpdateMany.mockReset().mockResolvedValue({ count: 1 });
  weDeleteMany.mockReset().mockResolvedValue({ count: 1 });
  sessionFindFirst
    .mockReset()
    .mockResolvedValue({ id: 'ws-1', _count: { exercises: 3 } });
  exerciseCount.mockReset().mockResolvedValue(1);
  transaction.mockReset().mockResolvedValue([]);
});

describe('addWorkoutSet', () => {
  it('reaches the owner through workoutExercise.session, the only path there is', async () => {
    await addWorkoutSet(validSet);

    expect(weFindFirst.mock.calls[0][0].where).toEqual({
      id: 'we-1',
      session: { ownerId: 'admin-1' },
    });
  });

  it('rejects a set written against a session the caller does not own', async () => {
    // The parent lookup is owner-scoped, so a workoutExerciseId belonging to
    // somebody else's session simply does not resolve — and nothing is
    // written. Without the traversal a bare `workoutExerciseId` would be the
    // only thing between a caller and a stranger's training log.
    weFindFirst.mockResolvedValue(null);

    const res = await addWorkoutSet({
      ...validSet,
      workoutExerciseId: 'someone-elses',
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Workout exercise not found');
    expect(setCreate).not.toHaveBeenCalled();
  });

  it('appends at the current set count rather than a client position', async () => {
    await addWorkoutSet({ ...validSet, position: 0 });

    const data = setCreate.mock.calls[0][0].data;
    expect(data.position).toBe(2);
  });

  it('stores completedAt as a Date and returns it as an ISO string', async () => {
    const res = await addWorkoutSet(validSet);

    expect(setCreate.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
    if (!res.success) throw new Error('expected success');
    expect(res.data.completedAt).toBe('2026-08-22T11:35:00.000Z');
  });

  it('converts weightKg and rpe out of Decimal', async () => {
    const res = await addWorkoutSet(validSet);

    if (!res.success) throw new Error('expected success');
    expect(res.data.weightKg).toBe(102.5);
    expect(typeof res.data.weightKg).toBe('number');
    expect(res.data.rpe).toBe(8.5);
  });

  it('rejects a weight beyond two decimal places, which the column would round', async () => {
    const res = await addWorkoutSet({ ...validSet, weightKg: 102.555 });

    expect(res.success).toBe(false);
    expect(setCreate).not.toHaveBeenCalled();
  });

  it('accepts a two-decimal weight that float modulo would have rejected', async () => {
    const res = await addWorkoutSet({ ...validSet, weightKg: 102.55 });

    expect(res.success).toBe(true);
  });

  it('rejects an RPE off the half-point scale', async () => {
    const res = await addWorkoutSet({ ...validSet, rpe: 8.3 });

    expect(res.success).toBe(false);
    expect(setCreate).not.toHaveBeenCalled();
  });

  it('surfaces a Prisma failure through errorMsg', async () => {
    setCreate.mockRejectedValue(new Error('connection lost'));

    const res = await addWorkoutSet(validSet);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBeTruthy();
  });
});

describe('updateWorkoutSet', () => {
  const validUpdate = { id: 'set-1', reps: 6, weightKg: 105, rpe: 9 };

  it('carries the traversed owner predicate inside the mutating statement', async () => {
    await updateWorkoutSet(validUpdate);

    expect(setUpdateMany.mock.calls[0][0].where).toEqual({
      id: 'set-1',
      workoutExercise: { session: { ownerId: 'admin-1' } },
    });
  });

  it('rejects an update against another owner’s set', async () => {
    setUpdateMany.mockResolvedValue({ count: 0 });

    const res = await updateWorkoutSet({ ...validUpdate, id: 'someone-elses' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Set not found');
    expect(setFindFirst).not.toHaveBeenCalled();
  });

  it('does not let a caller renumber a set, which is its performed order', async () => {
    await updateWorkoutSet({ ...validUpdate, position: 0 });

    expect(setUpdateMany.mock.calls[0][0].data.position).toBeUndefined();
  });

  it('clears completedAt when the caller sends null', async () => {
    await updateWorkoutSet({ ...validUpdate, completedAt: null });

    expect(setUpdateMany.mock.calls[0][0].data.completedAt).toBeNull();
  });
});

describe('deleteWorkoutSet', () => {
  it('deletes through the traversed owner predicate', async () => {
    const res = await deleteWorkoutSet({ id: 'set-1' });

    expect(res.success).toBe(true);
    expect(setDeleteMany.mock.calls[0][0].where).toEqual({
      id: 'set-1',
      workoutExercise: { session: { ownerId: 'admin-1' } },
    });
  });

  it('reports another owner’s set as not found', async () => {
    setDeleteMany.mockResolvedValue({ count: 0 });

    const res = await deleteWorkoutSet({ id: 'someone-elses' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Set not found');
  });
});

describe('addWorkoutExercise', () => {
  const validAdd = { sessionId: 'ws-1', exerciseId: 'ex-1' };

  it('checks the session AND the catalog entry against the caller', async () => {
    await addWorkoutExercise(validAdd);

    expect(sessionFindFirst.mock.calls[0][0].where).toEqual({
      id: 'ws-1',
      ownerId: 'admin-1',
    });
    expect(exerciseCount.mock.calls[0][0].where).toEqual({
      id: 'ex-1',
      ownerId: 'admin-1',
    });
  });

  it('refuses to append to a session the caller does not own', async () => {
    sessionFindFirst.mockResolvedValue(null);

    const res = await addWorkoutExercise({
      ...validAdd,
      sessionId: 'someone-elses',
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Workout not found');
    expect(weCreate).not.toHaveBeenCalled();
  });

  it('refuses an exercise id from another owner’s catalog', async () => {
    // The FK proves the row exists; the session detail read joins the catalog
    // entry in, so an unchecked id would hand back a stranger's exercise name.
    exerciseCount.mockResolvedValue(0);

    const res = await addWorkoutExercise({
      ...validAdd,
      exerciseId: 'someone-elses',
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Exercise not found');
    expect(weCreate).not.toHaveBeenCalled();
  });

  it('appends at the current exercise count', async () => {
    await addWorkoutExercise(validAdd);

    expect(weCreate.mock.calls[0][0].data.position).toBe(3);
  });

  it('returns the row with the catalog fields flattened', async () => {
    const res = await addWorkoutExercise(validAdd);

    if (!res.success) throw new Error('expected success');
    expect(res.data.exerciseName).toBe('Bench Press');
    expect(res.data.metric).toBe('weight_reps');
    expect(res.data.sets).toEqual([]);
  });
});

describe('reorderWorkoutExercises', () => {
  it('renumbers from the array order, owner-scoped on every write', async () => {
    const res = await reorderWorkoutExercises({
      sessionId: 'ws-1',
      orderedIds: ['we-3', 'we-1', 'we-2'],
    });

    expect(res.success).toBe(true);
    const positions = weUpdateMany.mock.calls.map(
      (call) => [call[0].where.id, call[0].data.position] as const
    );
    expect(positions).toEqual([
      ['we-3', 0],
      ['we-1', 1],
      ['we-2', 2],
    ]);
    for (const call of weUpdateMany.mock.calls) {
      expect(call[0].where.session).toEqual({ ownerId: 'admin-1' });
    }
  });

  it('reads the current order through the owner, not the session id alone', async () => {
    await reorderWorkoutExercises({
      sessionId: 'ws-1',
      orderedIds: ['we-1', 'we-2', 'we-3'],
    });

    expect(weFindMany.mock.calls[0][0].where).toEqual({
      sessionId: 'ws-1',
      session: { ownerId: 'admin-1' },
    });
  });

  it('rejects a partial list, which would leave two rows sharing a position', async () => {
    const res = await reorderWorkoutExercises({
      sessionId: 'ws-1',
      orderedIds: ['we-1', 'we-2'],
    });

    expect(res.success).toBe(false);
    expect(weUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects an id belonging to a different session', async () => {
    const res = await reorderWorkoutExercises({
      sessionId: 'ws-1',
      orderedIds: ['we-1', 'we-2', 'somebody-elses'],
    });

    expect(res.success).toBe(false);
    expect(weUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a duplicated id, which would silently drop a row', async () => {
    const res = await reorderWorkoutExercises({
      sessionId: 'ws-1',
      orderedIds: ['we-1', 'we-1', 'we-2'],
    });

    expect(res.success).toBe(false);
    expect(weUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a reorder of a session the caller cannot see', async () => {
    weFindMany.mockResolvedValue([]);

    const res = await reorderWorkoutExercises({
      sessionId: 'someone-elses',
      orderedIds: ['we-1'],
    });

    expect(res.success).toBe(false);
    expect(weUpdateMany).not.toHaveBeenCalled();
  });
});

describe('removeWorkoutExercise', () => {
  it('deletes through the traversed owner predicate', async () => {
    const res = await removeWorkoutExercise({ id: 'we-1' });

    expect(res.success).toBe(true);
    expect(weDeleteMany.mock.calls[0][0].where).toEqual({
      id: 'we-1',
      session: { ownerId: 'admin-1' },
    });
  });

  it('reports another owner’s exercise as not found', async () => {
    weDeleteMany.mockResolvedValue({ count: 0 });

    const res = await removeWorkoutExercise({ id: 'someone-elses' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Workout exercise not found');
  });
});
