/**
 * Anonymous readers call this for the public count. A failure must not carry the
 * database's own text back to them; the detail goes to the log.
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

import { getBlogInteractionsForUser } from './get-blog-interactions-for-user';

import { PUBLIC_ACTION_FAILURE_MESSAGE } from '@/shared/api';
import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';
import { INTERACTION } from '@/shared/lib/constants';

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';

const findUnique = mock();
const count = mock();
const original = Object.getOwnPropertyDescriptor(prisma, 'interaction');
const logError = spyOn(logger, 'error').mockImplementation(() => {});

beforeEach(() => {
  findUnique.mockReset().mockResolvedValue(null);
  count.mockReset().mockResolvedValue(4);
  logError.mockClear();
  Object.defineProperty(prisma, 'interaction', {
    value: { findUnique, count },
    writable: true,
    configurable: true,
  });
  setTestUser(null);
});

afterAll(() => {
  if (original) Object.defineProperty(prisma, 'interaction', original);
  logError.mockRestore();
  resetTestUser();
});

describe('getBlogInteractionsForUser', () => {
  it('returns the public count to an anonymous reader', async () => {
    const res = await getBlogInteractionsForUser(BLOG_ID, INTERACTION.LIKE);

    expect(res).toEqual({
      success: true,
      data: { isInteracted: false, count: 4 },
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('answers a database failure with a fixed message and logs the detail', async () => {
    count.mockRejectedValue(
      new Error("Can't reach database server at db.internal.example:5432")
    );

    const res = await getBlogInteractionsForUser(BLOG_ID, INTERACTION.LIKE);

    expect(res).toEqual({
      success: false,
      errorMsg: PUBLIC_ACTION_FAILURE_MESSAGE,
    });
    expect(JSON.stringify(logError.mock.calls)).toContain(
      'db.internal.example'
    );
  });
});
