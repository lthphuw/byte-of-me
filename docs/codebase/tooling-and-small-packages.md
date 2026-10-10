# Tooling and small packages

> Root toolchain (scripts, Turbo, git hooks, lint and format, Node pin, docker-compose) and the `config`, `storage` and `logger` packages. Source: `package.json`, `turbo.json`, `eslint.config.mjs`, `tsconfig.json`, `scripts/`, `.husky/`, `.commitlintrc.json`, `.prettierrc.json`, `.editorconfig`, `.nvmrc`, `.vercelignore`, `docker-compose.yml`, `packages/config`, `packages/storage`, `packages/logger`.

## Layout

```text
.
├── package.json          root scripts; workspaces apps/* packages/*; workspaces.catalog; bun@1.4.3
├── turbo.json            task graph, cache rules, build env allowlist (names only)
├── eslint.config.mjs     the only ESLint config (flat); every workspace uses it
├── tsconfig.json         extends packages/config nextjs.json; paths @/* @db/* @logger/*
├── scripts/
│   ├── check.sh          bun run check: check-types, lint, test, build
│   ├── gen-icons.ts      bun run gen:icons: brand-mark.ts -> SVG, PNG, ICO
│   └── icons.lock.json   sha256 of the 4 favicon SVG sources (written by gen-icons)
├── .husky/               pre-commit, pre-push, commit-msg (husky 8)
├── .commitlintrc.json    extends @commitlint/config-conventional
├── .prettierrc.json      prettier options (.prettierignore beside it; skips the generated Prisma client)
├── .editorconfig         UTF-8, LF, 2-space indent, final newline
├── .nvmrc                Node pin v24.4.1 (package.json engines: >=22.0.0)
├── .vercelignore         dev-only dirs and docs/superpowers are not deployed
├── docker-compose.yml    local services (table below)
└── packages/
    ├── config/typescript base.json, nextjs.json, node-library.json (tsconfig presets, no code)
    ├── storage/src       index.ts -> storage.ts, storage.interface.ts, s3.factory.ts
    └── logger/src        index.ts (Logger class + logger singleton)
```

### Root scripts

| script | runs | use it when |
| --- | --- | --- |
| `dev` | `turbo run dev` (only `apps/web`: `next dev --turbopack`) | running the site locally |
| `build` | `turbo run build` (web, db, storage, logger) | production build; also writes package `dist/` |
| `check` | `bash scripts/check.sh` (steps in Run) | before you call work done |
| `check-types` | `turbo run check-types` | type errors only |
| `lint` / `lint:fix` | `turbo run lint` / `turbo run lint:fix` | lint, or autofix |
| `test` | `turbo run test` (`bun test` in web, ui, db, storage, logger) | running all suites |
| `generate` | `bun run --filter '@byte-of-me/db' generate` (`prisma generate`) | after a Prisma schema change |
| `postinstall` / `prepare` | `bun run generate` / `husky install` | install time; `prepare` points `core.hooksPath` at `.husky` |
| `gen:icons` | `bun run scripts/gen-icons.ts` | after editing `brand-mark.ts` |
| `format` / `format:check` | `prettier --write` / `--check` on `{apps,packages}/*/src/**` | see Gotchas |

### Turbo graph (`turbo.json`, Turbo 2.9.14)

- `build` dependsOn `^build` (dependency workspaces build first); outputs `dist/**` and `.next/**` minus `.next/cache` and `.next/dev`; inputs add `.env*`.
- `generate` dependsOn `^generate`. Nothing else has a dependsOn.
- `cache: false` on `dev`, `lint:fix`, `generate`, all `db:*`; `persistent` on `dev` and `db:migrate:dev`.
- `globalDependencies`: `eslint.config.mjs`, `packages/config/typescript/*.json`. `db:*` have no root script: `bun run --filter '@byte-of-me/db' db:push`.

### Git hooks

| hook | runs | fails the git operation when |
| --- | --- | --- |
| `pre-commit` | `./node_modules/.bin/turbo run check-types lint` | any type or lint error |
| `commit-msg` | removes `Co-authored-by:` and attribution lines (`Generated/Made/Created with/by`), then `npx commitlint --edit` | message breaks Conventional Commits |
| `pre-push` | `./node_modules/.bin/turbo run test build` | any test or build failure |

### packages/config (tsconfig presets, no code)

- `base.json`: `strict`, `esModuleInterop`, `skipLibCheck`, `resolveJsonModule`. Extended by the two presets below; `packages/db` extends it directly.
- `nextjs.json` (extends base): ESNext modules, `moduleResolution: node`, ES2023, `jsx: preserve`, `noEmit`, `isolatedModules`, Next plugin. Used by root `tsconfig.json`, `apps/web`, `packages/ui`.
- `node-library.json` (extends base): `module: commonjs`, ES2019. Used by `packages/storage`, `packages/logger`.

### packages/storage public API

`src/index.ts` re-exports `storage.ts` and `storage.interface.ts`.

| export | signature -> result | notes |
| --- | --- | --- |
| `Storage` (class) | `new Storage(config, client?, signUrl?)` | `client` defaults to `createS3Client(config)`; trailing `/` stripped from `publicEndpoint` |
| `Storage#uploadFile` | `({ fileKey, body, contentType? })` -> `{ fileKey }` | PutObject |
| `Storage#deleteFile` | `(key)` -> SDK result | DeleteObject |
| `Storage#getFile` | `(key)` -> `{ body, contentType, contentLength }` | `body` is a web `ReadableStream`, `undefined` when S3 sends none |
| `Storage#copyFileFrom` | `(sourceBucket, sourceKey, destKey)` -> `{ fileKey }` | server-side CopyObject |
| `Storage#getPublicUrl` | `(key)` -> string | `${publicEndpoint}/${bucket}/${key}`, key not encoded |
| `Storage#getPresignedUploadUrl` | `(key, expiresIn?)` -> signed PUT URL | `signUrl` is injectable |
| `StorageConfig` (type) | `region`, `bucket`, `publicEndpoint`, `endpoint?`, `credentials?` | `storage.interface.ts` |
| `UploadFileParams` (type) | `fileKey`, `body`, `contentType?` | body: `Buffer`, `Uint8Array`, `Blob` or `string` |

Not exported from the index: `createS3Client` (`src/s3.factory.ts`, always `forcePathStyle: true`).

### packages/logger public API

| export | shape | notes |
| --- | --- | --- |
| `logger` | `new Logger()` singleton | what callers import; namespace `byte-of-me` |
| `Logger` (class) | `new Logger(name = 'byte-of-me')` | `name` becomes `namespace` on each entry |
| `Logger#debug`, `info`, `warn`, `error` | `(message, meta?)` -> void | debug and info -> `console.log`; warn -> `console.warn`; error -> `console.error` |
| `Logger#setLogLevel` / `getLogLevel` | `(level)` / `()` -> `LogLevel` | an invalid level logs a warning and keeps the current one |
| `LogLevel` (type) | `'debug'`, `'info'`, `'warn'`, `'error'`, `'silent'` | `silent` suppresses everything |

### docker-compose.yml

| service | image | ports (host:container) |
| --- | --- | --- |
| `postgres` | `postgres:17.6` | `5432:5432` |
| `mailpit` | `axllent/mailpit:v1.31.4` | `1025:1025`, `8025:8025` |

## Key flows

- `bun run check` -> `scripts/check.sh`: `turbo run check-types` -> `lint` -> `test` -> `build`; `set -e` stops at the first failing step.
- Commit: `.husky/pre-commit` (check-types, lint), then `.husky/commit-msg` (strip attribution lines, commitlint). Push: `.husky/pre-push` (test, build).
- Icons: `apps/web/src/shared/lib/brand-mark.ts` -> `scripts/gen-icons.ts` -> `apps/web/public/` (PNG, ICO), `apps/web/public/icons/` (SVG, 16/32 PNG), `scripts/icons.lock.json`. `apps/web/src/shared/lib/icon-set.spec.ts` reads the lock.
- Storage: `apps/web/src/shared/api/s3-storage-api.ts` (`supabaseStorage = new Storage(...)`) -> `packages/storage/src/storage.ts` -> S3 client. Callers: `apps/web/src/entities/media/api/`.
- Logger: `packages/logger/src/index.ts` -> level gate -> `console.*`. Imported by `apps/web` and `packages/db/src/index.ts`.

## Recipes

**Add a root script**
1. Add it to `scripts` in `package.json`. Example: `gen:icons` -> `scripts/gen-icons.ts`.
2. To run per workspace through Turbo, add a task to `turbo.json` and define the script in each workspace. Example: `lint:fix` (`cache: false`).
3. Add it to `scripts/check.sh` only if it belongs in the gate.

**Change the brand mark or favicon**
1. Edit `apps/web/src/shared/lib/brand-mark.ts`. `FAVICON_FILES` (line 93) decides which SVGs are generated.
2. Run `bun run gen:icons`.
3. Commit the regenerated `apps/web/public/` files with `scripts/icons.lock.json`. Verify with `bun run --filter 'web' test` (runs `icon-set.spec.ts`).

**Add a `Storage` operation**
1. Add the method to `packages/storage/src/storage.ts`, following `copyFileFrom` (line 91).
2. Add new types to `packages/storage/src/storage.interface.ts`; `src/index.ts` re-exports them.
3. Test with the injected `mockClient` in `packages/storage/__tests__/storage.spec.ts`. Example: the `copyFileFrom` test (line 149).

## Gotchas

- Editing `eslint.config.mjs` or `packages/config/typescript/*.json` misses every task's cache (`globalDependencies`).
- `check-types`, `lint` and `test` have no `dependsOn`, so they never run `generate`; `check.sh` type-checks before `build` runs `prisma generate`. Run `bun run generate` after a schema change.
- `no-explicit-any`, `no-console` (`eslint.config.mjs:98-100`) and `simple-import-sort` are `warn`; no lint script passes `--max-warnings`, so `bun run lint` passes with them.
- Root `format` and `format:check` run the `prettier` in the root `devDependencies` (`^2.8.8`), so keep it there. `.prettierignore` excludes `packages/db/src/generated`, which `prisma generate` rewrites.
- `LOG_LEVEL` is never read: the level is `NODE_ENV === 'production' ? 'info' : 'debug'`, so the "Invalid LOG_LEVEL" branch (`packages/logger/src/index.ts:10-13`) cannot fire.
- The logger level is module-global (`src/index.ts:7`): `setLogLevel` on any instance changes all of them. Each entry is multi-line pretty JSON.
- `copyFileFrom` uses `encodeURI`, which leaves `#`, `?`, `&` and `+` unencoded although its docblock warns about `#`. No caller exists in the repo; the spec covers only a space (`storage.spec.ts:149`).
- `getPublicUrl` does not encode the key (`storage.ts:104`). Media keys are safe because `buildMediaFileKey` uses a generated ID (`apps/web/src/entities/media/model/media-file-key.ts`).

## Run

```sh
bun run check          # full gate: the four steps below, fail-fast
bun run check-types
bun run lint           # bun run lint:fix to autofix
bun run test
bun run build
bun run dev            # apps/web only
bun run gen:icons      # after editing brand-mark.ts
bun run generate       # after a Prisma schema change
```

`bun run check` runs `scripts/check.sh`, which calls `turbo run` in this order: `check-types`, `lint`, `test`, `build`.

## AGENTS.md deviations

- `scripts/gen-icons.ts:1-17` and `:35-47` — §11.14: 17-line header and 13-line docblock.
- `scripts/gen-icons.ts:7` — §11.11: says "the five SVGs"; `FAVICON_FILES` (`apps/web/src/shared/lib/brand-mark.ts:93-98`) lists four.
- `scripts/check.sh:2-10` — §11.14: 9-line header comment.
- `packages/storage/src/storage.ts:53-67` and `:83-90` — §11.14: 15-line and 8-line docblocks.
- `.husky/commit-msg:4-7` and `:11-14` — §11.14: two 4-line comment blocks.

## See also

- [web-shared.md](web-shared.md): the storage instance and brand-mark sources under `apps/web/src/shared`.
- [packages-db.md](packages-db.md): `@byte-of-me/db` (`generate`, `db:*` scripts).
- [../architecture.md](../architecture.md): system diagrams.
- [root README](../../README.md).
