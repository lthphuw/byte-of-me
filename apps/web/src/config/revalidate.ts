export const revalidateTime = Number.isNaN(Number(process.env.NEXT_CACHE))
  ? 86400
  : Number(process.env.NEXT_CACHE);

export const dbCachingConfig = {
  swr: Number.isNaN(Number(process.env.PRISMA_CACHE_SWR))
    ? 86400
    : Number(process.env.PRISMA_CACHE_SWR),
  ttl: Number.isNaN(Number(process.env.PRISMA_CACHE_TTL))
    ? 86400
    : Number(process.env.PRISMA_CACHE_TTL),
};
