// Type-only entry point.
//
// The main entry (`./index.ts`) has module-scope side effects — `dotenv/config`,
// a throw when `DATABASE_URL` is missing, and `new PrismaClient()`. Consumers
// that only need the generated model/`Prisma` types must import from here so
// they never pull the client (and its env requirements) into their bundle.
export type * from './generated/prisma/client';
