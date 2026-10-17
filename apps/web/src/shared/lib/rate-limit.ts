import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { getErrorMessage } from '@/shared/lib/utils';

type RateLimitOptions = {
  /** Caller-scoped bucket, e.g. `contact:${ip}` or `comment:${userId}`. */
  key: string;
  /** Maximum number of hits allowed inside one window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
};

/**
 * Fixed-window limiter on the `rate_limit_hits` table; one atomic upsert on the composite id stops
 * concurrent requests racing past the limit. Any database failure fails OPEN: a guard, never a gate.
 */
export async function checkRateLimit({
  key,
  limit,
  windowSec,
}: RateLimitOptions): Promise<{ allowed: boolean }> {
  const windowMs = windowSec * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  try {
    const hit = await prisma.rateLimitHit.upsert({
      where: { key_windowStart: { key, windowStart } },
      update: { count: { increment: 1 } },
      create: { key, windowStart },
      select: { count: true },
    });

    // Opportunistic cleanup: only the first hit of a window pays for it, so
    // the sweep runs at most once per key per window and stays bounded.
    if (hit.count === 1) {
      await prisma.rateLimitHit.deleteMany({
        where: {
          windowStart: { lt: new Date(windowStart.getTime() - windowMs * 2) },
        },
      });
    }

    return { allowed: hit.count <= limit };
  } catch (error) {
    logger.warn(
      `Rate limit check failed for ${key}: ${getErrorMessage(error)}`
    );
    return { allowed: true };
  }
}
