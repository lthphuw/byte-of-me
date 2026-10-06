/**
 * Sign-in mail is bucketed per client (never per address) and fails open.
 * Prisma's `rateLimitHit` delegate is replaced, as in `rate-limit.spec.ts`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { isMagicLinkRequestAllowed } from './magic-link-rate-limit';

const upsert = mock();
const deleteMany = mock();
Object.defineProperty(prisma, 'rateLimitHit', {
  value: { upsert, deleteMany },
  writable: true,
  configurable: true,
});

const from = (ip: string) => async () =>
  new Headers({ 'x-vercel-forwarded-for': ip });

const bucketOf = () => upsert.mock.calls.at(-1)?.[0].where.key_windowStart.key;

describe('isMagicLinkRequestAllowed', () => {
  beforeEach(() => {
    upsert.mockReset().mockResolvedValue({ count: 1 });
    deleteMany.mockReset().mockResolvedValue({ count: 0 });
  });

  it('allows a request inside the budget', async () => {
    upsert.mockResolvedValue({ count: 5 });

    await expect(isMagicLinkRequestAllowed(from('203.0.113.7'))).resolves.toBe(
      true
    );
  });

  it('refuses the request that goes over the budget', async () => {
    upsert.mockResolvedValue({ count: 6 });

    await expect(isMagicLinkRequestAllowed(from('203.0.113.7'))).resolves.toBe(
      false
    );
  });

  it('keeps one bucket per client address', async () => {
    await isMagicLinkRequestAllowed(from('203.0.113.7'));
    const first = bucketOf();
    await isMagicLinkRequestAllowed(from('203.0.113.8'));
    const second = bucketOf();

    expect(first).not.toBe(second);
  });

  it('fails open when the request headers cannot be read', async () => {
    const outsideARequest = async () => {
      throw new Error('headers() called outside a request scope');
    };

    await expect(isMagicLinkRequestAllowed(outsideARequest)).resolves.toBe(
      true
    );
    expect(upsert).not.toHaveBeenCalled();
  });
});
