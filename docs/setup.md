# First-time setup

From a fresh `git clone` to a running site with seeded content and a working dashboard login. Steps 2–7 were run end to end on a clean clone on 2026-10-10. Run commands from the repo root.

## Versions

| Tool | Version | Locked by |
| --- | --- | --- |
| Node.js | 24.4.1 | `.nvmrc` |
| Bun | 1.3.10 | `packageManager` in `package.json` |
| npm packages | as in `bun.lock` | `bun install --frozen-lockfile` |
| PostgreSQL | 17.6 | `docker-compose.yml` (tag and digest) |
| Mailpit | v1.31.4 | `docker-compose.yml` (tag and digest) |
| Docker | Docker Compose (tested with v5.3.1) | |

PostgreSQL 16 does not work. Migration `20260807140000_widen_note_search_vector` uses `SET EXPRESSION`, which needs PostgreSQL 17.

## 1. Install the tools

```bash
nvm install        # reads .nvmrc: Node 24.4.1
nvm use
npm install -g bun@1.3.10
```

## 2. Create the env files

```bash
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env
```

In `apps/web/.env`, paste the output of `openssl rand -base64 32` after `AUTH_SECRET=`. The other defaults run the app against the local Docker stack. Every key: [environment.md](environment.md).

## 3. Install dependencies

```bash
bun install --frozen-lockfile
```

## 4. Start PostgreSQL and Mailpit

```bash
docker compose up -d
```

- PostgreSQL: `localhost:5432`, user `admin`, password `secret`, database `byte_of_me`.
- Mailpit: SMTP on `localhost:1025`, inbox at http://localhost:8025.

## 5. Create the schema and seed it

```bash
bun run --filter '@byte-of-me/db' db:migrate:apply
bun run --filter '@byte-of-me/db' db:seed
```

Use `db:migrate:apply`, not `db:migrate:deploy`, on a new database. One migration creates indexes with `CREATE INDEX CONCURRENTLY`, which Prisma cannot run inside its transaction. `db:migrate:apply` runs those statements one at a time and records them. Re-running the seed is safe.

The seed creates sample content: the admin (`EMAIL`), an author with id `cseedauthor0000000000001`, a profile in English and Vietnamese, 17 tech stacks, one sample project, one sample blog with a short body, one like and one comment. Source: [`packages/db/prisma/seed.ts`](../packages/db/prisma/seed.ts).

## 6. Run the app

```bash
bun run dev
```

Open http://localhost:3000. It redirects to `/en`.

## 7. Sign in to the dashboard

1. Open http://localhost:3000/en/auth/login.
2. Enter the `EMAIL` address.
3. Open http://localhost:8025 and click the magic link.

Only the `EMAIL` address can reach `/en/dashboard`.

## Verify

```bash
bun run check        # type-check, lint, test, build
```

Expect `✓ All checks passed.` The last run on a clean clone: 935 tests passed, lint 0 errors and 4 warnings in `packages/ui`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Public pages render empty, no error | `AUTHOR_ID` in `apps/web/.env` must be `cseedauthor0000000000001` |
| `Invalid environment variables` at start | a required key is missing, or `EMAIL` is not an email. Compare with `.env.example` |
| Seed fails: `… already belongs to user …` | you signed in before seeding. Reset (below), then migrate, seed and sign in |
| Magic link never arrives | `docker compose ps` should list mailpit. Check `EMAIL_SERVER_PORT=1025` |
| Port 3000 is busy | `PORT=3001 bun run dev`, and set `AUTH_URL=http://localhost:3001` |
| Sign-in refused | the address is not `EMAIL` (or `OWNER_EMAIL`) |
| `CREATE INDEX CONCURRENTLY cannot run inside a transaction block` | you ran `db:migrate:deploy` on a new database. Use `db:migrate:apply` |

Reset the local database. This deletes its data:

```bash
docker compose down -v && docker compose up -d
bun run --filter '@byte-of-me/db' db:migrate:apply
bun run --filter '@byte-of-me/db' db:seed
```

## Existing local database (PostgreSQL 16)

`docker-compose.yml` now runs PostgreSQL 17.6 on a new volume, `postgres17_data`. The old volume `byte-of-me_postgres_data` is left alone, but PostgreSQL 17 cannot start on its PostgreSQL 16 data. To keep that data, dump it before you recreate the container:

```bash
docker exec byteofme_postgres pg_dump -U admin -Fc byte_of_me > byte_of_me_pg16.dump
```

Restoring the dump into the new container is manual. It is not tested here.

## Supabase instead of Docker

Not tested here.

- `DATABASE_URL` and `DIRECT_URL`: your Supabase Postgres 17 connection strings. Run `db:migrate:apply` against the direct connection (port 5432), not the transaction pooler (port 6543).
- Storage: the `SUPABASE_S3_STORAGE_*` keys from Supabase > Storage.
