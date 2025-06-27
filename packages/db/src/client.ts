import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../generated/prisma/client';

export const runtime = 'edge';

console.log(
  'process.env.POSTGRES_PRISMA_URL: ',
  process.env.POSTGRES_PRISMA_URL,
);
const adapter = new PrismaNeon({
  connectionString: process.env.POSTGRES_PRISMA_URL,
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
