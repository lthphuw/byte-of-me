/**
 * What this spec defends: `localDate` is derived server-side from the START of
 * a session in the caller's zone, every session read and write is owner-
 * scoped, a routine cannot be borrowed from another owner to seed a session,
 * finishing sets `endedAt`, `Decimal` columns arrive as numbers, and a Prisma
 * failure surfaces through `errorMsg`.
 *
 * Delegates are replaced wholesale (never `spyOn`): Prisma 7 synthesizes a
 * fresh function on every method access, so a spy on a delegate method is
 * bypassed.
 */
import { Prisma, prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as DeleteModule from './delete-workout-session';
import type * as FinishModule from './finish-workout-session';
import type * as OpenModule from './get-open-workout-session';
import type * as DetailModule from './get-workout-session';
import type * as ListModule from './get-workout-sessions';
import type * as StartModule from './start-workout-session';

let startWorkoutSession: typeof StartModule.startWorkoutSession;
let getOpenWorkoutSession: typeof OpenModule.getOpenWorkoutSession;
let getWorkoutSession: typeof DetailModule.getWorkoutSession;
let getWorkoutSessions: typeof ListModule.getWorkoutSessions;
let finishWorkoutSession: typeof FinishModule.finishWorkoutSession;
let deleteWorkoutSession: typeof DeleteModule.deleteWorkoutSession;

beforeAll(async () => {
  ({ startWorkoutSession } = await import('./start-workout-session'));
  ({ getOpenWorkoutSession } = await import('./get-open-workout-session'));
  ({ getWorkoutSession } = await import('./get-workout-session'));
  ({ getWorkoutSessions } = await import('./get-workout-sessions'));
  ({ finishWorkoutSession } = await import('./finish-workout-session'));
  ({ deleteWorkoutSession } = await import('./delete-workout-session'));
});

const sessionCount = mock();
const sessionCreate = mock();
const sessionFindFirst = mock();
const sessionFindMany = mock();
const sessionUpdateMany = mock();
const sessionDeleteMany = mock();
Object.defineProperty(prisma, 'workoutSession', {
  value: {
    count: sessionCount,
    create: sessionCreate,
    findFirst: sessionFindFirst,
    findMany: sessionFindMany,
    updateMany: sessionUpdateMany,
    deleteMany: sessionDeleteMany,
  },
  writable: true,
  configurable: true,
});

const routineFindFirst = mock();
Object.defineProperty(prisma, 'routine', {
  value: { findFirst: routineFindFirst },
  writable: true,
  configurable: true,
});

const detailRow = {
  id: 'ws-1',
  localDate: new Date('2026-08-22T00:00:00.000Z'),
  startedAt: new Date('2026-08-22T11:30:00.000Z'),
  endedAt: null,
  title: 'Push Day',
  notes: null,
  // `Decimal(3,1)`. Left as a Decimal it would reach the client as an object
  // whose digits live in internal fields, and read as NaN in any arithmetic.
  sessionRpe: new Prisma.Decimal('7.5'),
  routineId: 'rt-1',
  exercises: [
    {
      id: 'we-1',
      position: 0,
      notes: null,
      exerciseId: 'ex-1',
      exercise: {
        name: 'Bench Press',
        primaryMuscle: 'chest',
        equipment: 'barbell',
        metric: 'weight_reps',
      },
      sets: [
        {
          id: 'set-1',
          position: 0,
          reps: 8,
          weightKg: new Prisma.Decimal('102.50'),
          rpe: new Prisma.Decimal('8.5'),
          durationSec: null,
          isWarmup: false,
          completedAt: new Date('2026-08-22T11:35:00.000Z'),
        },
      ],
    },
  ],
};

const listRow = {
  id: 'ws-1',
  localDate: new Date('2026-08-22T00:00:00.000Z'),
  startedAt: new Date('2026-08-22T11:30:00.000Z'),
  endedAt: new Date('2026-08-22T12:45:00.000Z'),
  title: 'Push Day',
  notes: null,
  sessionRpe: new Prisma.Decimal('7.5'),
  routineId: 'rt-1',
  _count: { exercises: 4 },
};

// 18:30 local on the 22nd in UTC+7, which is 11:30 UTC on the same day.
const startedAt = '2026-08-22T11:30:00.000Z';
const timeZone = 'Asia/Ho_Chi_Minh';

beforeEach(() => {
  sessionCount.mockReset().mockResolvedValue(0);
  sessionCreate.mockReset().mockResolvedValue(detailRow);
  sessionFindFirst.mockReset().mockResolvedValue(detailRow);
  sessionFindMany.mockReset().mockResolvedValue([listRow]);
  sessionUpdateMany.mockReset().mockResolvedValue({ count: 1 });
  sessionDeleteMany.mockReset().mockResolvedValue({ count: 1 });
  routineFindFirst.mockReset().mockResolvedValue({
    id: 'rt-1',
    name: 'Push Day',
    items: [{ exerciseId: 'ex-1' }, { exerciseId: 'ex-2' }],
  });
});

describe('startWorkoutSession', () => {
  it('derives localDate from the START time in the caller zone', async () => {
    await startWorkoutSession({ routineId: 'rt-1', startedAt, timeZone });

    const data = sessionCreate.mock.calls[0][0].data;
    expect(data.localDate.toISOString()).toBe('2026-08-22T00:00:00.000Z');
  });

  it('keeps a session that starts after local midnight on its OWN day', async () => {
    // 17:30 UTC on the 22nd is 00:30 local on the 23rd in UTC+7. The day a
    // workout belongs to is the day it started, in the caller's zone — the
    // opposite end from a sleep, which belongs to the day it ended.
    await startWorkoutSession({
      routineId: null,
      title: 'Late session',
      startedAt: '2026-08-22T17:30:00.000Z',
      timeZone,
    });

    const data = sessionCreate.mock.calls[0][0].data;
    expect(data.localDate.toISOString()).toBe('2026-08-23T00:00:00.000Z');
  });

  it('rejects a localDate sent by the client rather than honouring it', async () => {
    await startWorkoutSession({
      routineId: null,
      title: 'Empty',
      startedAt,
      timeZone,
      localDate: '1999-01-01',
    });

    // The schema strips unknown keys, so the caller's day never reaches the
    // column phase 3 joins on.
    const data = sessionCreate.mock.calls[0][0].data;
    expect(data.localDate.toISOString()).toBe('2026-08-22T00:00:00.000Z');
  });

  it('stamps the authenticated owner and snapshots the routine name', async () => {
    await startWorkoutSession({ routineId: 'rt-1', startedAt, timeZone });

    const data = sessionCreate.mock.calls[0][0].data;
    expect(data.ownerId).toBe('admin-1');
    expect(data.title).toBe('Push Day');
  });

  it('seeds the exercises from the routine, numbered by plan order', async () => {
    await startWorkoutSession({ routineId: 'rt-1', startedAt, timeZone });

    const created = sessionCreate.mock.calls[0][0].data.exercises.create;
    expect(created).toEqual([
      { exerciseId: 'ex-1', position: 0 },
      { exerciseId: 'ex-2', position: 1 },
    ]);
  });

  it('scopes the routine lookup to the owner', async () => {
    await startWorkoutSession({ routineId: 'rt-1', startedAt, timeZone });

    expect(routineFindFirst.mock.calls[0][0].where.ownerId).toBe('admin-1');
  });

  it('refuses to seed from a routine this owner does not have', async () => {
    routineFindFirst.mockResolvedValue(null);

    const res = await startWorkoutSession({
      routineId: 'someone-elses',
      startedAt,
      timeZone,
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Routine not found');
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('starts an empty session with a caller-supplied title', async () => {
    const res = await startWorkoutSession({
      routineId: null,
      title: 'Improvised',
      startedAt,
      timeZone,
    });

    expect(res.success).toBe(true);
    expect(routineFindFirst).not.toHaveBeenCalled();
    const data = sessionCreate.mock.calls[0][0].data;
    expect(data.title).toBe('Improvised');
    expect(data.exercises).toBeUndefined();
  });

  it('rejects an empty session with no title, so a heading cannot be blank', async () => {
    const res = await startWorkoutSession({
      routineId: null,
      startedAt,
      timeZone,
    });

    expect(res.success).toBe(false);
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('refuses a second session while one is still running', async () => {
    // `endedAt IS NULL` is the whole definition of "in progress"; two open
    // rows would make `getOpenWorkoutSession` pick one arbitrarily.
    sessionCount.mockResolvedValue(1);

    const res = await startWorkoutSession({
      routineId: 'rt-1',
      startedAt,
      timeZone,
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('A workout is already in progress');
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown time zone without touching the database', async () => {
    const res = await startWorkoutSession({
      routineId: null,
      title: 'Empty',
      startedAt,
      timeZone: 'Mars/Olympus_Mons',
    });

    expect(res.success).toBe(false);
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('surfaces a Prisma failure through errorMsg', async () => {
    sessionCreate.mockRejectedValue(new Error('connection lost'));

    const res = await startWorkoutSession({
      routineId: 'rt-1',
      startedAt,
      timeZone,
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBeTruthy();
  });
});

describe('getOpenWorkoutSession', () => {
  it('looks for the owner’s session with no end time', async () => {
    await getOpenWorkoutSession();

    expect(sessionFindFirst.mock.calls[0][0].where).toEqual({
      ownerId: 'admin-1',
      endedAt: null,
    });
  });

  it('returns null rather than throwing when nothing is running', async () => {
    sessionFindFirst.mockResolvedValue(null);

    const res = await getOpenWorkoutSession();

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data).toBeNull();
  });

  it('serializes dates and converts every Decimal to a number', async () => {
    const res = await getOpenWorkoutSession();

    if (!res.success || !res.data) throw new Error('expected a session');
    expect(res.data.localDate).toBe('2026-08-22');
    expect(res.data.startedAt).toBe('2026-08-22T11:30:00.000Z');
    expect(res.data.sessionRpe).toBe(7.5);

    const [set] = res.data.exercises[0].sets;
    expect(set.weightKg).toBe(102.5);
    expect(typeof set.weightKg).toBe('number');
    expect(set.rpe).toBe(8.5);
    expect(set.completedAt).toBe('2026-08-22T11:35:00.000Z');
    expect(res.data.exercises[0].exerciseName).toBe('Bench Press');
  });

  it('surfaces a Prisma failure through errorMsg', async () => {
    sessionFindFirst.mockRejectedValue(new Error('connection lost'));

    const res = await getOpenWorkoutSession();

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBeTruthy();
  });
});

describe('getWorkoutSession', () => {
  it('scopes the read to the owner, so another owner’s id is simply absent', async () => {
    await getWorkoutSession({ id: 'ws-1' });

    expect(sessionFindFirst.mock.calls[0][0].where).toEqual({
      id: 'ws-1',
      ownerId: 'admin-1',
    });
  });

  it('returns null rather than throwing for an id this owner cannot reach', async () => {
    sessionFindFirst.mockResolvedValue(null);

    const res = await getWorkoutSession({ id: 'someone-elses' });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data).toBeNull();
  });
});

describe('getWorkoutSessions', () => {
  it('scopes the read to the owner and bounds both ends', async () => {
    await getWorkoutSessions({ from: '2026-08-01', to: '2026-08-22' });

    const where = sessionFindMany.mock.calls[0][0].where;
    expect(where.ownerId).toBe('admin-1');
    expect(where.localDate.gte.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(where.localDate.lte.toISOString()).toBe('2026-08-22T00:00:00.000Z');
  });

  it('orders newest first, which is the order the history reads in', async () => {
    await getWorkoutSessions({ from: '2026-08-01', to: '2026-08-22' });

    expect(sessionFindMany.mock.calls[0][0].orderBy[0]).toEqual({
      localDate: 'desc',
    });
  });

  it('counts the exercises without loading them', async () => {
    const res = await getWorkoutSessions({
      from: '2026-08-01',
      to: '2026-08-22',
    });

    if (!res.success) throw new Error('expected success');
    expect(res.data[0].exerciseCount).toBe(4);
    expect(res.data[0].localDate).toBe('2026-08-22');
    expect(res.data[0].endedAt).toBe('2026-08-22T12:45:00.000Z');
  });

  it('rejects a reversed range without touching the database', async () => {
    const res = await getWorkoutSessions({
      from: '2026-08-22',
      to: '2026-08-01',
    });

    expect(res.success).toBe(false);
    expect(sessionFindMany).not.toHaveBeenCalled();
  });

  it('returns an empty list rather than throwing for a quiet window', async () => {
    sessionFindMany.mockResolvedValue([]);

    const res = await getWorkoutSessions({
      from: '2026-08-01',
      to: '2026-08-22',
    });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data).toEqual([]);
  });
});

describe('finishWorkoutSession', () => {
  const finish = {
    id: 'ws-1',
    endedAt: '2026-08-22T12:45:00.000Z',
    sessionRpe: 7.5,
  };

  beforeEach(() => {
    sessionFindFirst
      .mockReset()
      .mockResolvedValueOnce({ startedAt: detailRow.startedAt })
      .mockResolvedValue(listRow);
  });

  it('sets endedAt, which is the whole definition of finished', async () => {
    const res = await finishWorkoutSession(finish);

    expect(res.success).toBe(true);
    const data = sessionUpdateMany.mock.calls[0][0].data;
    expect(data.endedAt.toISOString()).toBe('2026-08-22T12:45:00.000Z');
    if (!res.success) throw new Error('expected success');
    expect(res.data.endedAt).toBe('2026-08-22T12:45:00.000Z');
  });

  it('carries the owner predicate inside the mutating statement', async () => {
    await finishWorkoutSession(finish);

    expect(sessionUpdateMany.mock.calls[0][0].where).toEqual({
      id: 'ws-1',
      ownerId: 'admin-1',
    });
  });

  it('records the session RPE as a number the Decimal column accepts', async () => {
    const res = await finishWorkoutSession(finish);

    expect(sessionUpdateMany.mock.calls[0][0].data.sessionRpe).toBe(7.5);
    if (!res.success) throw new Error('expected success');
    expect(res.data.sessionRpe).toBe(7.5);
  });

  it('refuses an end time before the stored start time', async () => {
    // Duration is `endedAt - startedAt`; a negative one would feed a negative
    // training load into every downstream figure instead of failing visibly.
    const res = await finishWorkoutSession({
      ...finish,
      endedAt: '2026-08-22T09:00:00.000Z',
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('A workout cannot end before it starts');
    expect(sessionUpdateMany).not.toHaveBeenCalled();
  });

  it('reports a session this owner cannot reach as not found', async () => {
    sessionFindFirst.mockReset().mockResolvedValue(null);

    const res = await finishWorkoutSession({ ...finish, id: 'someone-elses' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Workout not found');
    expect(sessionUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a session RPE above the Foster scale', async () => {
    const res = await finishWorkoutSession({ ...finish, sessionRpe: 12 });

    expect(res.success).toBe(false);
    expect(sessionUpdateMany).not.toHaveBeenCalled();
  });
});

describe('deleteWorkoutSession', () => {
  it('deletes scoped to the owner and relies on the schema cascade', async () => {
    const res = await deleteWorkoutSession({ id: 'ws-1' });

    expect(res.success).toBe(true);
    expect(sessionDeleteMany.mock.calls[0][0].where).toEqual({
      id: 'ws-1',
      ownerId: 'admin-1',
    });
  });

  it('reports a session this owner cannot reach as not found', async () => {
    sessionDeleteMany.mockResolvedValue({ count: 0 });

    const res = await deleteWorkoutSession({ id: 'someone-elses' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Workout not found');
  });
});
