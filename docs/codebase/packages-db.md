# Database package (`packages/db`)
> Prisma schema, generated client, `prisma` singleton and test DB guard for `@byte-of-me/db`. Source: `packages/db/prisma/schema.prisma`, `packages/db/prisma.config.ts`, `packages/db/src/index.ts`, `packages/db/src/types.ts`, `packages/db/test-setup.ts`, `packages/db/bunfig.toml`, `packages/db/__tests__/`, `packages/db/prisma/migrations/`, `packages/db/prisma/migrate-project-descriptions.ts`.

## Layout

```text
packages/db/
├── prisma/
│   ├── schema.prisma                    # 41 models, generator, datasource; no enums
│   ├── migrations/                      # 36 folders (grouped below) + migration_lock.toml (postgresql)
│   ├── apply-migrations.ts              # db:migrate:apply: migrate deploy, but CONCURRENTLY migrations run statement by statement (untracked at writing)
│   └── migrate-project-descriptions.ts  # one-off: plain-text project descriptions to TipTap JSON; --dry-run; no reference outside its own header
├── prisma.config.ts                     # Prisma CLI: dotenv, schema and migrations paths, datasource URL from DATABASE_URL (empty fallback)
├── src/
│   ├── index.ts                         # createPrismaClient(deps?), prisma singleton, re-exports generated client
│   ├── types.ts                         # type-only entry: @byte-of-me/db/types
│   └── generated/prisma/                # generated, do not edit (tracked in git)
├── test-setup.ts                        # bun preload: points DB URLs at a local placeholder, then guards them
├── bunfig.toml                          # [test] preload = ./test-setup.ts
├── __tests__/prisma.spec.ts             # 3 tests of createPrismaClient wiring; no queries
├── .env.example                         # DATABASE_URL, DIRECT_URL, NODE_ENV, EMAIL
├── .swcrc                               # referenced by no file in the repo
└── dist/                                # build output, gitignored; nothing consumes it (AGENTS §1)
```

### Models (41, by domain)

Relations show the schema's `onDelete` (`cascade`, `setNull`, or `no onDelete`). Every model has `id String @id @default(cuid())` except the nine composite-key models marked "no `id`". Enums: none (Gotcha 5).

| Model (table) | Key fields | Unique / PK | Relations | Translation sibling |
|---|---|---|---|---|
| **Users, auth & settings** | | | | |
| `Account` (`accounts`) | `provider`, `providerAccountId`, OAuth token columns | `(provider, providerAccountId)` | user → User (cascade) | — |
| `Session` (`sessions`) | `sessionToken`, `expires` | `sessionToken` | user → User (cascade) | — |
| `VerificationToken` (`verification_tokens`) | `identifier`, `token`, `expires` | `(identifier, token)`; no `id` | — | — |
| `User` (`users`) | `email`, `name`, `image`, `role` (String, default `"USER"`) | `email` | back-relations for all owner FKs | — |
| `SocialLink` (`social_links`) | `platform`, `url`, `sortOrder` | `(userId, platform)` | user → User (no onDelete) | — |
| `UserProfile` (`user_profiles`) | `birthdate` | `userId` (1:1) | user → User (cascade) | `UserProfileTranslation` |
| `UserProfileTranslation` (`user_profile_translations`) | `language` + 10 text fields (names, greeting, tagLine, quote, bio, aboutMe) | `(userProfileId, language)` | → UserProfile (cascade) | parent: UserProfile |
| `WorkspaceSettings` (`workspace_settings`) | `preferences` (Json, default `{}`; app validates the shape) | `ownerId` (1:1) | owner → User (cascade) | — |
| **Education** | | | | |
| `Education` (`educations`) | `startDate`, `endDate`, `sortOrder` | — | user → User (cascade); logo → Media (setNull) | `EducationTranslation` |
| `EducationTranslation` (`education_translations`) | `language`, `title`, `description` | `(educationId, language)` | → Education (cascade) | parent: Education |
| `EducationAchievement` (`education_achievements`) | `sortOrder` | — | → Education (cascade) | `EducationAchievementTranslation` |
| `EducationAchievementTranslation` (`education_achievement_translations`) | `language`, `title`, `content` | `(educationAchievementId, language)` | → EducationAchievement (cascade) | parent: EducationAchievement |
| `AchievementOnMedias` (`achievement_medias`) | join; timestamps only | `(educationAchievementId, mediaId)`; no `id` | → EducationAchievement, → Media (cascade) | — |
| **Featured works** | | | | |
| `FeaturedWork` (`featured_works`) | `isPublished`, `sortOrder`, `url` (proof link) | index `(userId, isPublished, sortOrder)` | user → User (cascade) | `FeaturedWorkTranslation` |
| `FeaturedWorkTranslation` (`featured_work_translations`) | `language`, `title`, `description`, `details` (TipTap JSON string) | `(featuredWorkId, language)` | → FeaturedWork (cascade) | parent: FeaturedWork |
| `FeaturedWorkMedia` (`featured_work_media`) | `sortOrder` (slot 0 or 1), `label` | `(featuredWorkId, mediaId)`; `(featuredWorkId, sortOrder)`; no `id` | → FeaturedWork, → Media (cascade) | — |
| **Work experience** | | | | |
| `Company` (`companies`) | `company`, `location`, `startDate`, `endDate` | — | user → User (cascade); logo → Media (setNull) | `CompanyTranslation` |
| `CompanyTranslation` (`company_translations`) | `language`, `description` | `(companyId, language)` | → Company (cascade) | parent: Company |
| `Role` (`roles`) | `startDate`, `endDate` | — | → Company (cascade) | `RoleTranslation` |
| `RoleTranslation` (`role_translations`) | `language`, `title`, `description` | `(roleId, language)` | → Role (cascade) | parent: Role |
| `Task` (`tasks`) | `sortOrder` | — | → Role (cascade) | `TaskTranslation` |
| `TaskTranslation` (`task_translations`) | `language`, `content` | `(taskId, language)` | → Task (cascade) | parent: Task |
| **Tech stack & tags** | | | | |
| `TechStack` (`tech_stacks`) | `name`, `slug`, `group`, `sortOrder` | `name`, `slug` | user → User (cascade); logo → Media (setNull) | — |
| `TechStackOnProjects` (`project_tech_stacks`) | join; timestamps only | `(projectId, techStackId)`; no `id` | → Project, → TechStack (cascade) | — |
| `TechStackOnCompanies` (`company_tech_stacks`) | join; timestamps only | `(techStackId, companyId)`; no `id` | → Company, → TechStack (cascade) | — |
| `Tag` (`tags`) | `slug` | `slug` | — | `TagTranslation` |
| `TagTranslation` (`tag_translations`) | `language`, `name` | `(tagId, language)` | → Tag (cascade) | parent: Tag |
| `BlogTag` (`blog_tags`) | join | `(blogId, tagId)`; no `id` | → Blog, → Tag (cascade) | — |
| `ProjectTag` (`project_tags`) | join | `(projectId, tagId)`; no `id` | → Project, → Tag (cascade) | — |
| **Projects & blogs** | | | | |
| `Project` (`projects`) | `slug`, `githubLink`, `liveLink`, `startDate`, `endDate`, `isPublished` | `slug`; indexes `(userId, isPublished, startDate)`, `(userId, createdAt desc)` | user → User (cascade); `blog` 1:1 via Blog | `ProjectTranslation` |
| `ProjectTranslation` (`project_translations`) | `language`, `title`, `description` | `(projectId, language)` | → Project (cascade) | parent: Project |
| `ProjectOnProjectCoAuthor` (`project_coauthors`) | join | `(projectId, coauthorId)`; no `id` | → Project, → Coauthor (cascade) | — |
| `Coauthor` (`coauthors`) | `fullName`, `email` | — | none; not user-owned | — |
| `Blog` (`blogs`) | `slug`, `isPublished`, `publishedDate`, `readingTime` | `slug`; `projectId` (1:1) | user → User (cascade); project → Project (setNull); cover → Media (setNull) | `BlogTranslation` |
| `BlogTranslation` (`blog_translations`) | `language`, `title`, `description`, `content` | `(blogId, language)` | → Blog (cascade) | parent: Blog |
| `BlogStatisticLog` (`blog_view_logs`) | view stats: `isAnonymous`, `viewerId`, `referrer`, `deviceType`, `browser`, `countryCode` | — | → Blog (cascade); viewer → User (no onDelete) | — |
| **Media, engagement & contact** | | | | |
| `Media` (`media`) | `fileName`, `fileKey`, `mimeType`, `size`, `provider`, `bucket`, `url` | `fileKey` | user → User (setNull); back-relations from Company, TechStack, Education, Blog, FeaturedWorkMedia, AchievementOnMedias | — |
| `Interaction` (`interactions`) | `type` (String, e.g. LIKE, CLAP); optional `blogId`, `projectId` | `(userId, blogId, type)`; `(userId, projectId, type)` | → User, Blog, Project (cascade) | — |
| `Comment` (`comments`) | `content`, `isDeleted`, `parentId` (threads) | — | → User, Blog, Project, parent Comment (cascade) | — |
| `ContactMessage` (`contact_messages`) | `name`, `email`, `subject`, `message`, `isRead`, `isReplied` | — | user → User (no onDelete) | — |
| `RateLimitHit` (`rate_limit_hits`) | `key`, `windowStart`, `count` | `(key, windowStart)`; no `id` | — | — |

### Migrations (36 folders, by purpose)

| Folders | Purpose |
|---|---|
| 16 (Mar 15–31) | Baseline. Mostly `init` folders; several drop and re-create the same tables |
| 2 (Jul 27) | Audit fixes: cascades, indexes, `rate_limit_hits`; drops `translations` |
| 13 (Aug 1 – Oct 6) | Personal workspace: notes, note documents, sleep, gym, day journal. `20261006120000_drop_personal_workspace` drops all of it |
| 1 (Aug 16) | `workspace_settings` |
| 1 (Aug 19) | Hot-path indexes; uses `CONCURRENTLY` (see Run) |
| 3 (Oct 10) | Featured works: base, details, demo media |

## Key flows

- Import: `apps/web/src/entities/tag/api/create-tag.ts:3` uses `import { prisma } from '@byte-of-me/db'`; types come from `@byte-of-me/db/types` (e.g. `apps/web/src/entities/tech-stack/model/types.ts:1`). The root import throws when `DATABASE_URL` is unset (`packages/db/src/index.ts:8-12`).
- Client: `createPrismaClient(deps?)` (`packages/db/src/index.ts:23-37`) builds `new PrismaPg({ connectionString })` from `@prisma/adapter-pg` and passes it as `adapter` to `new PrismaClient`. `PrismaDeps` (`:18-21`) is the test seam. No query engine (AGENTS §1).
- Singleton: `prisma = globalThis.prisma ?? createPrismaClient()` (`packages/db/src/index.ts:53-58`), cached on `global` outside production only.
- Logging: `$on('query')` is attached outside production only and logs SQL, params and duration via `logger.debug` (`packages/db/src/index.ts:42-48`). Error, info and warn go to stdout (`:31-36`).
- Generated client: the `prisma-client` generator writes `packages/db/src/generated/prisma` (`packages/db/prisma/schema.prisma:1-7`); `packages/db/src/index.ts:60` re-exports it, so `PrismaClient`, `Prisma` and model types come from the package root.
- Prisma CLI: `packages/db/prisma.config.ts` loads `.env` via dotenv, sets the schema and migrations paths, and sets `datasource.url` to `process.env.DATABASE_URL ?? ""` (line 13), not `env()`, so generate runs on a fresh clone (comments at 11-12).
- Test guard: `packages/db/bunfig.toml` preloads `packages/db/test-setup.ts`, which overwrites `DATABASE_URL` and `DIRECT_URL` with a `127.0.0.1:1` placeholder (lines 16-19), then throws unless both contain `127.0.0.1` or `localhost` (lines 23-31).
- Tests: `packages/db/__tests__/prisma.spec.ts` (3 tests). Two use injected fakes for adapter and query wiring; one checks singleton reuse. None issues a query.

## Recipes

**1. Add a field to an existing model.** Example: `cef4721f` (`details` on `FeaturedWorkTranslation`).
1. Edit the model in `packages/db/prisma/schema.prisma` (`FeaturedWorkTranslation`, lines 206-222).
2. `cd packages/db && bun run db:migrate:dev` (read Gotcha 1 first).
3. `bun run generate` (from root) to refresh `packages/db/src/generated/prisma`.
4. Update the entity's schema and types, e.g. `apps/web/src/entities/featured-work/model/featured-work-schema.ts` and `apps/web/src/entities/featured-work/model/types.ts`.

**2. Add a model with a translation table.** Example: `0f1f46f7` (`FeaturedWork` and `FeaturedWorkTranslation`).
1. Copy the shape of `FeaturedWork` (`packages/db/prisma/schema.prisma:184-204`): cuid `id`, snake_case `@map`s, `userId` to `User` with `onDelete: Cascade`, `@@map`.
2. Add `XTranslation` with `language String` and `@@unique([xId, language])` (pattern: lines 206-222).
3. Add the back-relation field to `model User` (`packages/db/prisma/schema.prisma:61-94`).
4. Migrate and generate as in recipe 1. The same commit also changed the generated `models/FeaturedWork.ts`.

**3. Add an index.** Example migration: `20260819120000_add_hot_path_indexes`; pattern: `Project` (`packages/db/prisma/schema.prisma:508-511`).
1. Add `@@index([...], map: "idx_<table>_<cols>")` to the model. All 40 existing `@@index` lines are named this way.
2. Add a one-line comment naming the query it serves (style: `schema.prisma:509-510`).
3. Migrate and generate as in recipe 1. The example uses `CONCURRENTLY`, which the apply script's header says `migrate deploy` cannot run, so deploy it with `bun run db:migrate:apply` (see Run).

## Gotchas

1. Local `db:migrate:*` and `db:push` connect to production: `packages/db/.env` holds production values, and only tests are guarded (AGENTS §2). Override `DATABASE_URL` for the command, or do not run them.
2. `DIRECT_URL` is validated (`apps/web/src/shared/config/env.ts:9`), but no db code reads it outside the test guard. `prisma.config.ts` uses only `DATABASE_URL`, and the datasource has no `directUrl`. `packages/db/README.md:16` says migrations use it; they do not.
3. `packages/db/src/generated/prisma/` is tracked in git (49 files). A schema change changes these files, so commit the regenerated output with it. Never hand-edit it. Root `postinstall` runs generate (`package.json:66`), so `bun install` rewrites them too.
4. Model name is not table name: `BlogStatisticLog` is `prisma.blogStatisticLog` and maps to `blog_view_logs` (`packages/db/prisma/schema.prisma:610`, `:637`). Search the `@@map` value too.
5. No enums. `User.role` (`packages/db/prisma/schema.prisma:66`) and `Interaction.type` (`:750`) are plain `String`s, and the database accepts any value.
6. `packages/db/tsconfig.json:12-13` sets `strict: false` and `noImplicitAny: false`, overriding `packages/config/typescript/base.json` (`strict: true`). `check-types` misses what strict would catch.
7. The test guard is a substring check (`packages/db/test-setup.ts:25`): any URL containing `127.0.0.1` or `localhost` passes. It does not parse the host.
8. Migration history is not a replay. Read `schema.prisma` for the current shape, not the 16 early folders (e.g. `20260317161110_init_portfolio_schema` drops `accounts`; `20260330071045_init` drops `Account` and re-creates `accounts`).

## Run

```bash
cd packages/db              # run from here: bunfig.toml resolves against cwd (AGENTS §10)
bun run generate            # prisma generate into src/generated/prisma (root: bun run generate)
bun run check-types         # tsc --noEmit (non-strict, Gotcha 6)
bun run test                # bun test; test-setup.ts guard loads first
bun run db:migrate:dev      # prisma migrate dev: migration from schema diff, applied to .env DB (production, Gotcha 1)
bun run db:migrate:deploy   # prisma migrate deploy: apply committed migrations only
bun run db:migrate:apply    # prisma/apply-migrations.ts: deploy, but CONCURRENTLY migrations run statement by statement (untracked at writing)
bun run db:push             # prisma db push: sync schema without a migration file
```

## AGENTS.md deviations

- `packages/db/test-setup.ts:1-15`: §11.14, 15-line comment block (the rule allows three lines).
- `packages/db/src/types.ts:1-6`: §11.14, 6-line comment block.
- `packages/db/prisma/schema.prisma:847-861`: §11.14, 15-line `///` block above `WorkspaceSettings`.

## See also

- [web-entities-content.md](web-entities-content.md): blog, company, tag and featured-work entities that query `prisma`.
- [web-entities-supporting.md](web-entities-supporting.md): media, tech-stack and workspace-settings entities.
- [web-shared.md](web-shared.md): `apps/web/src/shared/lib/rate-limit.ts` (`RateLimitHit`) and `apps/web/src/shared/config/env.ts` (`DIRECT_URL`).
- [tooling-and-small-packages.md](tooling-and-small-packages.md): `@byte-of-me/logger` (used by `src/index.ts`) and the tsconfig presets.
- [../architecture.md](../architecture.md)
