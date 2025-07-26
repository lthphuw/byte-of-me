/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

import { env } from '@/env.mjs';

export const rateLimitChatPerMinute = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_CHAT_PER_MIN, '1 m'),
  analytics: true,
});

export const rateLimitChatPerDay = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_CHAT_PER_DAY, '24 h'),
  analytics: true,
});

export function getIndentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded
    ? forwarded.split(',')[0]?.trim()
    : realIp || (request as any).ip || 'anonymous';
  return ip;
}

export async function applyRateLimit(
  limiter: Ratelimit,
  req: NextRequest,
  key?: string
) {
  const identifier = key ?? getIndentifier(req);

  const result = await limiter.limit(identifier);
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error:
          'You’ve reached the rate limit (per minute or day). Please wait and try again soon.',
      }),
      {
        status: 429,
      }
    );
  }

  return null;
}
