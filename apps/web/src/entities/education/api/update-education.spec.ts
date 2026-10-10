/**
 * The outcome of `updateEducation`'s achievement rewrite: every achievement sent
 * is written (new created, known updated), dropped ones deleted, and a failed
 * write is a failure. The writes are issued together, so a dropped promise
 * would skip one silently. `$transaction` runs against a fake `tx`.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import type * as UpdateEducationModule from './update-education';

import type { EducationFormValues } from '@/entities/education/model/education-schema';

type Row = Record<string, unknown>;
const txFindFirst = mock<(args: unknown) => Promise<Row | null>>();
const txUpdate = mock<(args: unknown) => Promise<Row>>();
const achievement = {
  create: mock<(args: unknown) => Promise<Row>>(),
  update: mock<(args: unknown) => Promise<Row>>(),
  deleteMany: mock<(args: unknown) => Promise<Row>>(),
};

const originalTransaction = Object.getOwnPropertyDescriptor(
  prisma,
  '$transaction'
);
Object.defineProperty(prisma, '$transaction', {
  value: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      education: { findFirst: txFindFirst, update: txUpdate },
      educationAchievement: achievement,
    }),
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

let updateEducation: typeof UpdateEducationModule.updateEducation;

const input = (
  achievements: EducationFormValues['achievements']
): EducationFormValues => ({
  sortOrder: 0,
  startDate: new Date('2020-09-01T00:00:00.000Z'),
  endDate: null,
  logoId: null,
  translations: [{ language: 'en', title: 'Hanoi University' }],
  achievements,
});

const known = (id: string, title: string) => ({
  id,
  sortOrder: 0,
  translations: [{ language: 'en', title }],
  imageIds: ['media-1'],
});

beforeAll(async () => {
  ({ updateEducation } = await import('./update-education'));
});

beforeEach(() => {
  txFindFirst
    .mockReset()
    .mockResolvedValue({ achievements: [{ id: 'keep' }, { id: 'drop' }] });
  txUpdate.mockReset().mockResolvedValue({ id: 'edu-1' });
  achievement.create.mockReset().mockResolvedValue({});
  achievement.update.mockReset().mockResolvedValue({});
  achievement.deleteMany.mockReset().mockResolvedValue({});
  logError.mockClear();
});

afterAll(() => {
  if (originalTransaction)
    Object.defineProperty(prisma, '$transaction', originalTransaction);
  logError.mockRestore();
});

describe('updateEducation', () => {
  it('updates known achievements, creates new ones and deletes the dropped ones', async () => {
    const result = await updateEducation(
      'edu-1',
      input([
        known('keep', 'Dean list'),
        {
          sortOrder: 1,
          translations: [{ language: 'en', title: 'New' }],
          imageIds: [],
        },
      ])
    );

    expect(result.success).toBe(true);
    expect(achievement.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['drop'] } },
    });
    expect(achievement.update).toHaveBeenCalledTimes(1);
    expect(achievement.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'keep' },
      data: {
        translations: { create: [{ language: 'en', title: 'Dean list' }] },
      },
    });
    expect(achievement.create).toHaveBeenCalledTimes(1);
    expect(achievement.create.mock.calls[0]?.[0]).toMatchObject({
      data: { educationId: 'edu-1', sortOrder: 1 },
    });
  });

  it('writes every achievement of a long list, not just the first', async () => {
    txFindFirst.mockResolvedValue({
      achievements: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id })),
    });
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];

    await updateEducation('edu-1', input(ids.map((id) => known(id, id))));

    expect(
      achievement.update.mock.calls.map(
        (call) => (call[0] as { where: { id: string } }).where.id
      )
    ).toEqual(ids);
    expect(achievement.deleteMany).not.toHaveBeenCalled();
  });

  it('reports a failed write instead of a half-saved entry', async () => {
    achievement.update.mockRejectedValue(new Error('deadlock detected'));

    const result = await updateEducation(
      'edu-1',
      input([known('keep', 'Dean list')])
    );

    expect(result).toEqual({ success: false, errorMsg: 'deadlock detected' });
    expect(logError).toHaveBeenCalled();
  });

  it("writes nothing when the entry is not the caller's", async () => {
    txFindFirst.mockResolvedValue(null);

    const result = await updateEducation(
      'edu-1',
      input([known('keep', 'Dean list')])
    );

    expect(result).toEqual({
      success: false,
      errorMsg: 'Education entry not found',
    });
    expect(txUpdate).not.toHaveBeenCalled();
    expect(achievement.update).not.toHaveBeenCalled();
    expect(achievement.create).not.toHaveBeenCalled();
  });
});
