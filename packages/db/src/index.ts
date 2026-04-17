import { logger } from '@byte-of-me/logger';
import { PrismaPg } from '@prisma/adapter-pg';

import 'dotenv/config';

// eslint-disable-next-line import-alias/import-alias
import { PrismaClient } from '../generated/prisma/client';


const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "info" },
      { emit: "stdout", level: "warn" },
    ],
  });

if (!globalForPrisma.prisma) {
  prisma.$on("query" as never, (e: any) => {
    logger.info(`Query: ${e.query}`);
    logger.info(`Params: ${e.params}`);
    logger.info(`Duration: ${e.duration}ms`);
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from '../generated/prisma/client';
