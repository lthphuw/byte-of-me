/**
 * Prisma and the logger are mocked: these tests cover the fixed-window
 * decision logic (allow/block, window bucketing, fail-open), not the database.
 */
const upsert = jest.fn();
const deleteMany = jest.fn();
const warn = jest.fn();

jest.mock('@byte-of-me/db', () => ({
  prisma: { rateLimitHit: { upsert, deleteMany } },
}));

jest.mock('@byte-of-me/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() },
}));

import { checkRateLimit } from './rate-limit';

const opts = { key: 'contact:1.2.3.4', limit: 3, windowSec: 600 };

describe('checkRateLimit', () => {
  beforeEach(() => {
    upsert.mockReset();
    deleteMany.mockReset().mockResolvedValue({ count: 0 });
    warn.mockReset();
  });

  it('allows a hit below the limit', async () => {
    upsert.mockResolvedValue({ count: 2 });

    await expect(checkRateLimit(opts)).resolves.toEqual({ allowed: true });
  });

  it('allows the hit that reaches the limit exactly', async () => {
    upsert.mockResolvedValue({ count: 3 });

    await expect(checkRateLimit(opts)).resolves.toEqual({ allowed: true });
  });

  it('blocks the hit past the limit', async () => {
    upsert.mockResolvedValue({ count: 4 });

    await expect(checkRateLimit(opts)).resolves.toEqual({ allowed: false });
  });

  it('counts against a window start floored to the window size', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-27T10:07:30.000Z'));
    upsert.mockResolvedValue({ count: 2 });

    await checkRateLimit(opts);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          key_windowStart: {
            key: opts.key,
            windowStart: new Date('2026-07-27T10:00:00.000Z'),
          },
        },
        update: { count: { increment: 1 } },
        create: {
          key: opts.key,
          windowStart: new Date('2026-07-27T10:00:00.000Z'),
        },
      })
    );

    jest.useRealTimers();
  });

  it('sweeps expired windows only on the first hit of a window', async () => {
    upsert.mockResolvedValue({ count: 1 });
    await checkRateLimit(opts);
    expect(deleteMany).toHaveBeenCalledTimes(1);

    upsert.mockResolvedValue({ count: 2 });
    await checkRateLimit(opts);
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  it('fails open when the database throws', async () => {
    upsert.mockRejectedValue(new Error('connection refused'));

    await expect(checkRateLimit(opts)).resolves.toEqual({ allowed: true });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('connection refused')
    );
  });
});
