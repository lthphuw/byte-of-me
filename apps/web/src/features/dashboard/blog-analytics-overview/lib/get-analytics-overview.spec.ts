/**
 * The analytics read is owner-only and fails closed (AGENTS §8): a refused
 * guard rejects the call, it does not come back as an error envelope. The
 * `$queryRaw` delegate is replaced so no spec reaches a database.
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

import { getAnalyticsOverview } from './get-analytics-overview';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const queryRaw = mock();
const original = Object.getOwnPropertyDescriptor(prisma, '$queryRaw');
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

beforeEach(() => {
  queryRaw.mockReset();
  logError.mockClear();
});

afterAll(() => {
  if (original) Object.defineProperty(prisma, '$queryRaw', original);
  else Reflect.deleteProperty(prisma, '$queryRaw');
  logError.mockRestore();
  resetTestUser();
});

describe('getAnalyticsOverview', () => {
  it('rejects a non-admin before any query runs', async () => {
    setTestUser({ id: 'reader-1', role: 'USER' });
    try {
      await expect(getAnalyticsOverview()).rejects.toThrow('Unauthorized');
      expect(queryRaw).not.toHaveBeenCalled();
    } finally {
      resetTestUser();
    }
  });

  it('returns the 30-day series for the owner', async () => {
    queryRaw.mockResolvedValue([]);

    const res = await getAnalyticsOverview();

    expect(res.success).toBe(true);
    expect(res.data?.viewsByDay).toHaveLength(30);
    expect(res.data?.totalViewsLast30Days).toBe(0);
  });

  it('keeps a failed read as an error envelope, not a rejection', async () => {
    queryRaw.mockRejectedValue(new Error('connection lost'));

    const res = await getAnalyticsOverview();

    expect(res.success).toBe(false);
    expect(res.errorMsg).toBeTruthy();
    expect(logError).toHaveBeenCalled();
  });
});
