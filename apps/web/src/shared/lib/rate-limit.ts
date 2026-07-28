import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { getErrorMessage } from '@/shared/lib/utils';

export type RateLimitOptions = {
  /** Caller-scoped bucket, e.g. `contact:${ip}` or `comment:${userId}`. */
  key: string;
  /** Maximum number of hits allowed inside one window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
};

/**
 * Fixed-window rate limiter backed by the `rate_limit_hits` table.
 *
 * The counter is incremented with a single atomic upsert on the composite id,
 * so concurrent requests cannot race past the limit. The limiter is a guard,
 * never a gate: any database failure fails OPEN so a limiter outage can never
 * take down the write paths it protects.
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
    logger.warn(`Rate limit check failed for ${key}: ${getErrorMessage(error)}`);
    return { allowed: true };
  }
}
