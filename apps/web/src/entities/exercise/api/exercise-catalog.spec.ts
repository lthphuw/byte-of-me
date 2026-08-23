/**
 * What this spec defends: every catalog read and write is scoped to the
 * authenticated owner, the archive flag is a filter rather than a delete, a
 * caller cannot reach another owner's row by naming its id, and a Prisma
 * failure surfaces through `errorMsg` — the `ApiResponse` contract.
 *
 * Delegates are replaced wholesale (never `spyOn`) for the Prisma-7 reason
 * documented in the note specs: Prisma synthesizes a fresh function on every
 * method access, so a spy on a delegate method is simply bypassed.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as ArchiveModule from './archive-exercise';
import type * as CreateModule from './create-exercise';
import type * as GetModule from './get-exercises';
import type * as UpdateModule from './update-exercise';

let getExercises: typeof GetModule.getExercises;
let createExercise: typeof CreateModule.createExercise;
let updateExercise: typeof UpdateModule.updateExercise;
let archiveExercise: typeof ArchiveModule.archiveExercise;

beforeAll(async () => {
  ({ getExercises } = await import('./get-exercises'));
  ({ createExercise } = await import('./create-exercise'));
  ({ updateExercise } = await import('./update-exercise'));
  ({ archiveExercise } = await import('./archive-exercise'));
});

const findMany = mock();
const findFirst = mock();
const create = mock();
const updateMany = mock();
Object.defineProperty(prisma, 'exercise', {
  value: { findMany, findFirst, create, updateMany },
  writable: true,
  configurable: true,
});

const row = {
  id: 'ex-1',
  name: 'Bench Press',
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps', 'front_delts'],
  equipment: 'barbell',
  metric: 'weight_reps',
  isArchived: false,
};

const validCreate = {
  name: 'Bench Press',
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps'],
  equipment: 'barbell',
  metric: 'weight_reps',
};

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([row]);
  findFirst.mockReset().mockResolvedValue(row);
  create.mockReset().mockResolvedValue(row);
  updateMany.mockReset().mockResolvedValue({ count: 1 });
});

describe('getExercises', () => {
  it('scopes the read to the authenticated owner', async () => {
    await getExercises({});

    expect(findMany.mock.calls[0][0].where.ownerId).toBe('admin-1');
  });

  it('hides archived entries unless they are asked for', async () => {
    await getExercises({});
    expect(findMany.mock.calls[0][0].where.isArchived).toBe(false);

    await getExercises({ includeArchived: true });
    expect(findMany.mock.calls[1][0].where.isArchived).toBeUndefined();
  });

  it('filters on the primary muscle only, case-insensitively on the name', async () => {
    await getExercises({ search: 'bench', muscle: 'chest' });

    const where = findMany.mock.calls[0][0].where;
    expect(where.primaryMuscle).toBe('chest');
    expect(where.name).toEqual({ contains: 'bench', mode: 'insensitive' });
    // The filter answers "what do I train this muscle with"; an exercise that
    // merely involves it secondarily is not an answer to that question.
    expect(where.secondaryMuscles).toBeUndefined();
  });

  it('rejects a muscle outside the vocabulary without touching the database', async () => {
    const res = await getExercises({ muscle: 'delts' });

    expect(res.success).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns an empty list rather than throwing when nothing is stored', async () => {
    findMany.mockResolvedValue([]);

    const res = await getExercises({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data).toEqual([]);
  });

  it('surfaces a Prisma failure through errorMsg', async () => {
    findMany.mockRejectedValue(new Error('connection lost'));

    const res = await getExercises({});

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBeTruthy();
  });
});

describe('createExercise', () => {
  it('stamps the authenticated owner on the new row', async () => {
    await createExercise(validCreate);

    expect(create.mock.calls[0][0].data.ownerId).toBe('admin-1');
  });

  it('trims the name, which uniq_exercises_owner_name compares on', async () => {
    await createExercise({ ...validCreate, name: '  Bench Press  ' });

    expect(create.mock.calls[0][0].data.name).toBe('Bench Press');
  });

  it('rejects an unknown equipment code', async () => {
    const res = await createExercise({ ...validCreate, equipment: 'sandbag' });

    expect(res.success).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an unknown metric, which the set model depends on', async () => {
    const res = await createExercise({ ...validCreate, metric: 'distance' });

    expect(res.success).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it('surfaces a duplicate-name violation through errorMsg', async () => {
    create.mockRejectedValue(new Error('Unique constraint failed'));

    const res = await createExercise(validCreate);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBeTruthy();
  });
});

describe('updateExercise', () => {
  const validUpdate = { id: 'ex-1', ...validCreate };

  it('carries the owner predicate inside the mutating statement', async () => {
    await updateExercise(validUpdate);

    const where = updateMany.mock.calls[0][0].where;
    expect(where.id).toBe('ex-1');
    expect(where.ownerId).toBe('admin-1');
  });

  it('scopes the read-back to the owner too', async () => {
    await updateExercise(validUpdate);

    expect(findFirst.mock.calls[0][0].where.ownerId).toBe('admin-1');
  });

  it('reports a row this owner cannot reach as not found', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const res = await updateExercise({ ...validUpdate, id: 'someone-elses' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Exercise not found');
    expect(findFirst).not.toHaveBeenCalled();
  });
});

describe('archiveExercise', () => {
  it('sets the flag rather than deleting, scoped to the owner', async () => {
    const res = await archiveExercise({ id: 'ex-1', isArchived: true });

    expect(res.success).toBe(true);
    const call = updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'ex-1', ownerId: 'admin-1' });
    expect(call.data).toEqual({ isArchived: true });
  });

  it('un-archives through the same action', async () => {
    await archiveExercise({ id: 'ex-1', isArchived: false });

    expect(updateMany.mock.calls[0][0].data).toEqual({ isArchived: false });
  });

  it('reports a row this owner cannot reach as not found', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const res = await archiveExercise({
      id: 'someone-elses',
      isArchived: true,
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('Exercise not found');
  });
});
