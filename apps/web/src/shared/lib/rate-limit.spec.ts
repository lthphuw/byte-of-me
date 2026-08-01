/**
 * Prisma and the logger are mocked: these tests cover the fixed-window
 * decision logic (allow/block, window bucketing, fail-open), not the database.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { beforeEach, describe, expect, it, mock, setSystemTime, spyOn } from 'bun:test';

import { checkRateLimit } from './rate-limit';

// `prisma.rateLimitHit` is a stable object, but Prisma 7's generated client
// synthesizes a *new* function for each method access on it
// (`prisma.rateLimitHit.upsert !== prisma.rateLimitHit.upsert`), so
// `spyOn(prisma.rateLimitHit, 'upsert')` patches a value the client never
// reads back — the real method still runs underneath the spy. Replacing the
// whole model delegate with a plain stub object sidesteps that per-access
// synthesis while still needing no module mocking.
const upsert = mock();
const deleteMany = mock();
Object.defineProperty(prisma, 'rateLimitHit', {
  value: { upsert, deleteMany },
  writable: true,
  configurable: true,
});

const warn = spyOn(logger, 'warn');

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
    setSystemTime(new Date('2026-07-27T10:07:30.000Z'));
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

    setSystemTime();
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
