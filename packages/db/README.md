# @byte-of-me/db

Prisma 7 schema, migrations, seed and client for Byte of Me. PostgreSQL 17 through `@prisma/adapter-pg`; there is no query-engine binary.

Setup: [docs/setup.md](../../docs/setup.md) · env: [docs/environment.md](../../docs/environment.md) · code map: [docs/codebase/packages-db.md](../../docs/codebase/packages-db.md)

## Commands

From the repo root:

| Command | Use it when |
| --- | --- |
| `bun run --filter '@byte-of-me/db' db:migrate:apply` | a new database. Handles `CREATE INDEX CONCURRENTLY` |
| `bun run --filter '@byte-of-me/db' db:migrate:deploy` | production. Plain `prisma migrate deploy`; fails on a new database |
| `bun run --filter '@byte-of-me/db' db:migrate:dev` | writing a migration. If it proposes a reset, decline |
| `bun run --filter '@byte-of-me/db' db:seed` | demo content. Idempotent |
| `bun run generate` | after editing `schema.prisma` |
| `bun run --filter '@byte-of-me/db' check-types` | type-check |
| `bun run --filter '@byte-of-me/db' test` | tests. Refuses any non-local database |

From `packages/db`:

| Command | Use it when |
| --- | --- |
| `bunx prisma studio --port 7777` | browse the database |
| `bunx prisma migrate reset --force` | wipe and re-migrate. Destroys data |
| `bun run db:push` | prototyping only: schema without a migration file |

## What `db:migrate:apply` does

Runs `prisma migrate deploy`. When a migration fails only because it contains `CREATE INDEX CONCURRENTLY`, it runs that file's statements one by one, marks the migration applied with `migrate resolve`, and continues. Source: [`prisma/apply-migrations.ts`](prisma/apply-migrations.ts).

## Rules

- Never edit an applied migration. Prisma compares checksums, so an edit makes the history look drifted.
- The app and the Prisma CLI use `DATABASE_URL`. `DIRECT_URL` is validated by the app, but Prisma does not read it here.
- The seed writes a fixed author id, `cseedauthor0000000000001`. `AUTHOR_ID` in `apps/web/.env` must match it.
- The seed reads `EMAIL` from `packages/db/.env`. The seeded admin signs in with that address.

## Seed

Creates the admin (`EMAIL`), the author profile, 17 tech stacks, one project, one blog with an empty body, one like and one comment. Source: [`prisma/seed.ts`](prisma/seed.ts).
