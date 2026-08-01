import { logger } from '@byte-of-me/logger';
import { PrismaPg } from '@prisma/adapter-pg';

import 'dotenv/config';

import { type Prisma, PrismaClient } from './generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

export interface PrismaDeps {
  PrismaClient: typeof PrismaClient;
  PrismaPg: typeof PrismaPg;
}

export function createPrismaClient(deps: Partial<PrismaDeps> = {}) {
  const Client = deps.PrismaClient ?? PrismaClient;
  const Adapter = deps.PrismaPg ?? PrismaPg;

  const adapter = new Adapter({ connectionString });

  const client = new Client({
    adapter,
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'info' },
      { emit: 'stdout', level: 'warn' },
    ],
  });

  // Auth.js writes through this client, so query params include live
  // magic-link tokens, OAuth tokens, and user emails — never log them in
  // production, where the log stream may be shipped off-host.
  if (process.env.NODE_ENV !== 'production') {
    client.$on('query', (e: Prisma.QueryEvent) => {
      logger.debug(`Query: ${e.query}`);
      logger.debug(`Params: ${e.params}`);
      logger.debug(`Duration: ${e.duration}ms`);
    });
  }

  return client;
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from './generated/prisma/client';
