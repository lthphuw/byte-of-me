/**
 * `updateFeaturedWork` rewrites every translation (`deleteMany` + `create`), so
 * the `details` it writes is whatever the caller sent. An omitted `details` is
 * stored as null: a caller that does not send the body clears it. That is
 * deliberate and pinned here, so a form that drops the field cannot wipe a body
 * unnoticed. The transaction runs against a fake `tx`; no database is touched.
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

import { updateFeaturedWork } from './update-featured-work';

import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';
import { resetTestUser } from '@/shared/lib/auth/set-test-user.test-helper';

const DETAILS = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'How it was done.' }],
    },
  ],
});

const findFirst = mock(async (_args: unknown) => ({ id: 'fw-1' }));
const update = mock(async (_args: unknown) => ({ id: 'fw-1' }));

const originalTransaction = Object.getOwnPropertyDescriptor(
  prisma,
  '$transaction'
);
Object.defineProperty(prisma, '$transaction', {
  value: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ featuredWork: { findFirst, update } }),
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

beforeEach(() => {
  findFirst.mockClear();
  update.mockClear();
  logError.mockClear();
});

afterAll(() => {
  if (originalTransaction) {
    Object.defineProperty(prisma, '$transaction', originalTransaction);
  } else {
    Reflect.deleteProperty(prisma, '$transaction');
  }
  logError.mockRestore();
  resetTestUser();
});

type UpdateArgs = {
  data: {
    translations: {
      deleteMany: Record<string, never>;
      create: Array<{ language: string; details: string | null }>;
    };
  };
};

function writtenTranslations(): UpdateArgs['data']['translations']['create'] {
  const args = update.mock.calls[0]?.[0] as UpdateArgs;
  return args.data.translations.create;
}

const input = (
  translations: FeaturedWorkFormValues['translations']
): FeaturedWorkFormValues => ({ isPublished: true, url: '', translations });

describe('updateFeaturedWork details', () => {
  it('stores a translation sent without details as null, clearing any stored body', async () => {
    const res = await updateFeaturedWork(
      'fw-1',
      input([{ language: 'en', title: 'INT8 quantization' }])
    );

    expect(res.success).toBe(true);
    expect(writtenTranslations()).toEqual([
      expect.objectContaining({ language: 'en', details: null }),
    ]);
  });

  it('stores the details a caller sends', async () => {
    await updateFeaturedWork(
      'fw-1',
      input([{ language: 'en', title: 'INT8 quantization', details: DETAILS }])
    );

    expect(writtenTranslations()).toEqual([
      expect.objectContaining({ language: 'en', details: DETAILS }),
    ]);
  });
});
