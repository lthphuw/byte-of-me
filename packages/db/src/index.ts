import { logger } from '@byte-of-me/logger';
import { PrismaPg } from '@prisma/adapter-pg';

import 'dotenv/config';

import { PrismaClient } from './generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

export function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString });

  const client = new PrismaClient({
    adapter,
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'info' },
      { emit: 'stdout', level: 'warn' },
    ],
  });

  client.$on('query' as never, (e: any) => {
    logger.info(`Query: ${e.query}`);
    logger.info(`Params: ${e.params}`);
    logger.info(`Duration: ${e.duration}ms`);
  });

  return client;
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from './generated/prisma/client';
