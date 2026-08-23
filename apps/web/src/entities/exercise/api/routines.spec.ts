/**
 * What this spec defends: routines are owner-scoped on both the read and the
 * write, `position` is assigned from the array order rather than trusted from
 * the client, an item may not name an exercise the caller does not own,
 * `targetRpe` crosses the boundary as a number rather than a Prisma
 * `Decimal`, and a failure surfaces through `errorMsg`.
 */
import { Prisma, prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as ArchiveModule from './archive-routine';
import type * as CreateModule from './create-routine';
import type * as GetModule from './get-routines';
import type * as UpdateModule from './update-routine';

let getRoutines: typeof GetModule.getRoutines;
let createRoutine: typeof CreateModule.createRoutine;
let updateRoutine: typeof UpdateModule.updateRoutine;
let archiveRoutine: typeof ArchiveModule.archiveRoutine;

beforeAll(async () => {
  ({ getRoutines } = await import('./get-routines'));
  ({ createRoutine } = await import('./create-routine'));
  ({ updateRoutine } = await import('./update-routine'));
  ({ archiveRoutine } = await import('./archive-routine'));
});

const routineFindMany = mock();
const routineFindFirst = mock();
const routineCreate = mock();
const routineUpdateMany = mock();
const routineCount = mock();
Object.defineProperty(prisma, 'routine', {
  value: {
    findMany: routineFindMany,
    findFirst: routineFindFirst,
    create: routineCreate,
    updateMany: routineUpdateMany,
    count: routineCount,
  },
  writable: true,
  configurable: true,
});

const itemDeleteMany = mock();
const itemCreateMany = mock();
Object.defineProperty(prisma, 'routineExercise', {
  value: { deleteMany: itemDeleteMany, createMany: itemCreateMany },
  writable: true,
  configurable: true,
});

const exerciseCount = mock();
Object.defineProperty(prisma, 'exercise', {
  value: { count: exerciseCount },
  writable: true,
  configurable: true,
});

// The interactive transaction hands the callback the same stubbed client the
// actions use outside one, so a spec asserts on the delegate calls without
// caring whether they ran inside a BEGIN.
const transaction = mock();
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
  writable: true,
  configurable: true,
});

const storedRoutine = {
  id: 'rt-1',
  name: 'Push Day',
  notes: null,
  position: 0,
  isArchived: false,
  items: [
    {
      id: 'ri-1',
      position: 0,
      exerciseId: 'ex-1',
      targetSets: 3,
      targetRepsLow: 6,
      targetRepsHigh: 8,
      // Stored as `Decimal(3,1)`. A Decimal left in the response arrives at
      // the client as an object whose digits live in internal fields, and
      // every arithmetic use of it is then NaN.
      targetRpe: new Prisma.Decimal('8.5'),
      restSec: 180,
      exercise: {
        name: 'Bench Press',
        primaryMuscle: 'chest',
        metric: 'weight_reps',
      },
    },
  ],
};

const item = {
  exerciseId: 'ex-1',
  targetSets: 3,
  targetRepsLow: 6,
  targetRepsHigh: 8,
  targetRpe: 8.5,
  restSec: 180,
};

beforeEach(() => {
  routineFindMany.mockReset().mockResolvedValue([storedRoutine]);
  routineFindFirst.mockReset().mockResolvedValue(storedRoutine);
  routineCreate.mockReset().mockResolvedValue(storedRoutine);
  routineUpdateMany.mockReset().mockResolvedValue({ count: 1 });
  routineCount.mockReset().mockResolvedValue(2);
  itemDeleteMany.mockReset().mockResolvedValue({ count: 1 });
  itemCreateMany.mockReset().mockResolvedValue({ count: 1 });
  // The default is "every id asked about is owned", expressed as the count the
  // real query would return rather than a fixed 1 — the check compares against
  // the number of DISTINCT ids, so a constant would silently reject any
  // routine touching two different lifts.
  exerciseCount
    .mockReset()
    .mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.length
    );
  transaction
    .mockReset()
    .mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
});

describe('getRoutines', () => {
  it('scopes the read to the authenticated owner', async () => {
    await getRoutines({});

    expect(routineFindMany.mock.calls[0][0].where.ownerId).toBe('admin-1');
  });

  it('hides archived routines unless they are asked for', async () => {
    await getRoutines({});
    expect(routineFindMany.mock.calls[0][0].where.isArchived).toBe(false);

    await getRoutines({ includeArchived: true });
    expect(routineFindMany.mock.calls[1][0].where.isArchived).toBeUndefined();
  });

  it('asks the database for the items in performing order', async () => {
    await getRoutines({});

    const select = routineFindMany.mock.calls[0][0].select;
    expect(select.items.orderBy).toEqual({ position: 'asc' });
  });

  it('converts targetRpe out of Decimal and flattens the exercise', async () => {
    const res = await getRoutines({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    const [first] = res.data[0].items;
    expect(first.targetRpe).toBe(8.5);
    expect(typeof first.targetRpe).toBe('number');
    expect(first.exerciseName).toBe('Bench Press');
  });

  it('returns an empty list rather than throwing when nothing is stored', async () => {
    routineFindMany.mockResolvedValue([]);

    const res = await getRoutines({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data).toEqual([]);
  });

  it('surfaces a Prisma failure through errorMsg', async () => {
    routineFindMany.mockRejectedValue(new Error('connection lost'));

    const res = await getRoutines({});

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBeTruthy();
  });
});

describe('createRoutine', () => {
  it('stamps the authenticated owner on the new routine', async () => {
    await createRoutine({ name: 'Push Day', items: [item] });

    expect(routineCreate.mock.calls[0][0].data.ownerId).toBe('admin-1');
  });

  it('numbers the items from the array order, never from the client', async () => {
    await createRoutine({
      name: 'Push Day',
      items: [item, { ...item, exerciseId: 'ex-2' }],
    });

    const created = routineCreate.mock.calls[0][0].data.items.create;
    expect(created.map((i: { position: number }) => i.position)).toEqual([
      0, 1,
    ]);
  });

  it('refuses an item naming an exercise this owner does not have', async () => {
    // The FK proves the exercise exists; it says nothing about who owns it,
    // and `getRoutines` joins the catalog entry in to render the plan.
    exerciseCount.mockResolvedValue(0);

    const res = await createRoutine({
      name: 'Push Day',
      items: [{ ...item, exerciseId: 'someone-elses' }],
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Unknown exercise in routine');
    expect(routineCreate).not.toHaveBeenCalled();
  });

  it('counts distinct exercise ids, so programming a lift twice is allowed', async () => {
    exerciseCount.mockResolvedValue(1);

    const res = await createRoutine({
      name: 'Push Day',
      items: [item, { ...item, targetSets: 2 }],
    });

    expect(res.success).toBe(true);
    expect(exerciseCount.mock.calls[0][0].where.id.in).toEqual(['ex-1']);
  });

  it('scopes the ownership check for items to the caller', async () => {
    await createRoutine({ name: 'Push Day', items: [item] });

    expect(exerciseCount.mock.calls[0][0].where.ownerId).toBe('admin-1');
  });

  it('rejects a rep range whose low end exceeds its high end', async () => {
    const res = await createRoutine({
      name: 'Push Day',
      items: [{ ...item, targetRepsLow: 12, targetRepsHigh: 8 }],
    });

    expect(res.success).toBe(false);
    expect(routineCreate).not.toHaveBeenCalled();
  });
});

describe('updateRoutine', () => {
  const validUpdate = { id: 'rt-1', name: 'Push Day A', items: [item] };

  it('proves ownership in the same statement that renames', async () => {
    await updateRoutine(validUpdate);

    expect(routineUpdateMany.mock.calls[0][0].where).toEqual({
      id: 'rt-1',
      ownerId: 'admin-1',
    });
  });

  it('replaces the item list and renumbers from the array order', async () => {
    await updateRoutine({
      ...validUpdate,
      items: [{ ...item, exerciseId: 'ex-2' }, item],
    });

    expect(itemDeleteMany.mock.calls[0][0].where).toEqual({
      routineId: 'rt-1',
    });
    const rows = itemCreateMany.mock.calls[0][0].data;
    expect(rows.map((r: { exerciseId: string }) => r.exerciseId)).toEqual([
      'ex-2',
      'ex-1',
    ]);
    expect(rows.map((r: { position: number }) => r.position)).toEqual([0, 1]);
  });

  it('deletes nothing when the routine is not this owner’s', async () => {
    routineUpdateMany.mockResolvedValue({ count: 0 });

    const res = await updateRoutine({ ...validUpdate, id: 'someone-elses' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Routine not found');
    expect(itemDeleteMany).not.toHaveBeenCalled();
  });

  it('refuses an item naming an exercise this owner does not have', async () => {
    exerciseCount.mockResolvedValue(0);

    const res = await updateRoutine(validUpdate);

    expect(res.success).toBe(false);
    expect(routineUpdateMany).not.toHaveBeenCalled();
  });

  it('clears the items when the caller sends an empty list', async () => {
    const res = await updateRoutine({ ...validUpdate, items: [] });

    expect(res.success).toBe(true);
    expect(itemDeleteMany).toHaveBeenCalled();
    expect(itemCreateMany).not.toHaveBeenCalled();
  });
});

describe('archiveRoutine', () => {
  it('sets the flag rather than deleting, scoped to the owner', async () => {
    const res = await archiveRoutine({ id: 'rt-1', isArchived: true });

    expect(res.success).toBe(true);
    const call = routineUpdateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'rt-1', ownerId: 'admin-1' });
    expect(call.data).toEqual({ isArchived: true });
  });

  it('reports a routine this owner cannot reach as not found', async () => {
    routineUpdateMany.mockResolvedValue({ count: 0 });

    const res = await archiveRoutine({ id: 'someone-elses', isArchived: true });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Routine not found');
  });
});
