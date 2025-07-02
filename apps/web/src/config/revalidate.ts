export const revalidateTime = Number.isNaN(Number(process.env.NEXT_CACHE))
  ? 86400
  : Number(process.env.NEXT_CACHE);

export const dbCachingConfig = { swr: 3600, ttl: 3600 };
