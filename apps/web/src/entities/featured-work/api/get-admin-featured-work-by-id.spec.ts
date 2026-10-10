/**
 * The editor's by-id read: the owner gets the full row with each language's
 * `details`; another owner's id is not found; a non-admin or a malformed id gets
 * the failure envelope and never reaches the database. The Prisma delegate is
 * replaced with an in-memory fake that honours `where: { id, userId }`.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import { getAdminFeaturedWorkById } from './get-admin-featured-work-by-id';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const DETAILS_EN = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'How it was done.' }],
    },
  ],
});

type Row = {
  id: string;
  userId: string;
  translations: Array<{
    id: string;
    language: string;
    title: string;
    description: string | null;
    details: string | null;
  }>;
};

const ROWS: Row[] = [
  {
    id: 'fw-owned',
    userId: 'admin-1',
    translations: [
      {
        id: 't-en',
        language: 'en',
        title: 'INT8 quantization',
        description: null,
        details: DETAILS_EN,
      },
      {
        id: 't-vi',
        language: 'vi',
        title: 'Lượng tử hóa',
        description: null,
        details: null,
      },
    ],
  },
  {
    id: 'fw-other',
    userId: 'someone-else',
    translations: [
      {
        id: 't-other',
        language: 'en',
        title: 'Not yours',
        description: null,
        details: null,
      },
    ],
  },
];

const findFirst = mock(
  async (args: { where: { id: string; userId: string } }) =>
    ROWS.find(
      (r) => r.id === args.where.id && r.userId === args.where.userId
    ) ?? null
);

const original = Object.getOwnPropertyDescriptor(prisma, 'featuredWork');
Object.defineProperty(prisma, 'featuredWork', {
  value: { findFirst },
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});
const logWarn = spyOn(logger, 'warn').mockImplementation(() => {});

beforeEach(() => {
  findFirst.mockClear();
  logError.mockClear();
  logWarn.mockClear();
});

afterAll(() => {
  if (original) Object.defineProperty(prisma, 'featuredWork', original);
  else Reflect.deleteProperty(prisma, 'featuredWork');
  logError.mockRestore();
  logWarn.mockRestore();
  resetTestUser();
});

describe('getAdminFeaturedWorkById', () => {
  it('returns the row to its owner, with each language’s stored details', async () => {
    const res = await getAdminFeaturedWorkById('fw-owned');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.id).toBe('fw-owned');
    expect(res.data.translations.map((t) => [t.language, t.details])).toEqual([
      ['en', DETAILS_EN],
      ['vi', null],
    ]);
  });

  it('is not found when the id belongs to another owner', async () => {
    const res = await getAdminFeaturedWorkById('fw-other');

    expect(res).toEqual({
      success: false,
      errorMsg: 'Featured work not found',
    });
  });

  it('is not found for an id that does not exist', async () => {
    const res = await getAdminFeaturedWorkById('missing');

    expect(res).toEqual({
      success: false,
      errorMsg: 'Featured work not found',
    });
  });

  it('gives a non-admin the failure envelope without querying', async () => {
    setTestUser({ id: 'reader-1', role: 'USER' });
    try {
      const res = await getAdminFeaturedWorkById('fw-owned');

      expect(res.success).toBe(false);
      expect(findFirst).not.toHaveBeenCalled();
    } finally {
      resetTestUser();
    }
  });

  it('rejects an empty id before the query runs', async () => {
    const res = await getAdminFeaturedWorkById('');

    expect(res.success).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
