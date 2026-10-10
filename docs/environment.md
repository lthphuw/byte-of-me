# Environment variables

Two gitignored files, copied from the templates:

| File | Template | Read by |
| --- | --- | --- |
| `apps/web/.env` | `apps/web/.env.example` | the app: `apps/web/src/shared/config/env.ts` |
| `packages/db/.env` | `packages/db/.env.example` | Prisma CLI, migrations, seed |

The app validates `env.ts` at startup (`@t3-oss/env-nextjs`). A missing required key stops the app with `Invalid environment variables`. A blank value passes, unless the key has an email or URL rule.

## apps/web/.env

| Key | Required | Local value | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | `postgresql://admin:secret@localhost:5432/byte_of_me` | runtime Prisma client |
| `DIRECT_URL` | yes | same | validated only; no app code reads it |
| `AUTH_URL` | yes | `http://localhost:3000` | must be the origin you open |
| `AUTH_SECRET` | yes | output of `openssl rand -base64 32` | Auth.js cookie encryption |
| `EMAIL` | yes, valid email | `you@example.com` | the admin's sign-in address and the public contact address |
| `OWNER_EMAIL` | no; valid email if set | unset | admin identity; falls back to `EMAIL`. Keep it commented out when unused: an empty string fails the email check |
| `AUTHOR_ID` | yes | `cseedauthor0000000000001` | scopes all public content; must match the seed |
| `EMAIL_SERVER_HOST` | yes | `localhost` | SMTP; Mailpit locally |
| `EMAIL_SERVER_PORT` | yes | `1025` | |
| `EMAIL_SERVER_USER` | blank ok | blank | Mailpit takes no login |
| `EMAIL_SERVER_PASSWORD` | blank ok | blank | |
| `EMAIL_FROM` | yes | `"Byte of Me <dev@localhost>"` | |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | blank ok | blank | the GitHub button fails until you register an OAuth app |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | blank ok | blank | same for Google |
| `SUPABASE_S3_STORAGE_REGION` | yes | `ap-northeast-1` | |
| `SUPABASE_S3_STORAGE_ENDPOINT` | blank ok | blank | S3 API endpoint; uploads need a real one |
| `SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT` | blank ok | blank | base URL for displayed images |
| `SUPABASE_S3_STORAGE_ACCESS_KEY`, `SUPABASE_S3_STORAGE_SECRET_KEY` | blank ok | blank | |
| `SUPABASE_S3_STORAGE_BUCKET` | no; default `byte-of-me` | `byte-of-me` | |
| `NEXT_PUBLIC_AUTHOR_EMAIL` | no; default is the owner's address | `you@example.com` | shown on the public site |
| `NEXT_PUBLIC_ENV` | no | `development` | `development` or `production` |
| `NODE_ENV` | no | `development` | `development`, `production` or `test` |
| `NEXT_PUBLIC_GA_ID` | no | blank | Google Analytics measurement ID |
| `GITHUB_TOKEN` | no | blank | the open-source section stays hidden without it |
| `GITHUB_LOGIN` | no; default is the owner's login | your GitHub login | used only with `GITHUB_TOKEN` |

Read directly, not validated: `PORT` (dev server port) and `VERCEL_PROJECT_PRODUCTION_URL`, both in `apps/web/src/shared/config/host.ts`.

## packages/db/.env

| Key | Required | Local value | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | same as above | migrations and seed (`packages/db/prisma.config.ts`) |
| `DIRECT_URL` | yes | same | validation only |
| `NODE_ENV` | no | `development` | |
| `EMAIL` | yes, for the seed | same as `apps/web` `EMAIL` | the seeded admin's email |

## Known deviation

- `apps/web/src/shared/config/env.ts` defaults `EMAIL` (line 11) and `NEXT_PUBLIC_AUTHOR_EMAIL` (line 69) to the owner's address, and `GITHUB_LOGIN` (line 48) to the owner's login. AGENTS.md §11.7 forbids literals. Set them explicitly. The defaults are not removed here, because an environment that omits them would change behaviour.
