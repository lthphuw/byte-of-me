import { env } from '@/env.mjs';

export const revalidateTime = env.NEXT_CACHE;

export const dbCachingConfig = {
  swr: env.PRISMA_CACHE_SWR,
  ttl: env.PRISMA_CACHE_TTL,
};
