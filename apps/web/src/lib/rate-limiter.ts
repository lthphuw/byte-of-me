import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

import { env } from '@/env.mjs';

export const rateLimitPerMinute = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_CHAT_PER_MIN, '1 m'),
  analytics: true,
});

export const rateLimitPerDay = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_CHAT_PER_DAY, '24 h'),
  analytics: true,
});
