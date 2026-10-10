import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    // Not env(): that throws when unset, which fails `bun install` (postinstall
    // runs prisma generate) on a fresh clone. Database commands fail on their own.
    url: process.env.DATABASE_URL ?? "",
  },
});
