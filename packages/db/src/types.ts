// Type-only entry: `./index.ts` has module-scope side effects (`dotenv/config`, a throw without
// `DATABASE_URL`, `new PrismaClient()`). Import types from here to keep the client and its env
// requirements out of the bundle.
export type * from './generated/prisma/client';
