# Tooling and small packages

> Root toolchain (scripts, Turbo, git hooks, lint and format, Node pin, docker-compose) and the `config`, `storage` and `logger` packages. Source: `package.json`, `turbo.json`, `eslint.config.mjs`, `scripts/`, `.husky/`, `.commitlintrc.json`, `.prettierrc.json`, `.editorconfig`, `.nvmrc`, `.vercelignore`, `docker-compose.yml`, `packages/config`, `packages/storage`, `packages/logger`.

## Layout

```text
.
├── package.json          root scripts; workspaces apps/* packages/*; workspaces.catalog; bun@1.4.3
├── turbo.json            task graph (the `transit` task), cache rules and size cap, build env allowlist (names only)
├── eslint.config.mjs     the only ESLint config (flat); every workspace uses it
├── scripts/
│   ├── check.sh          bun run check: check-types, lint, boundaries, test, build
│   ├── check-boundaries.ts  bun run check-boundaries: package layers (docs/architecture.md)
│   ├── new-package.ts    bun run new-package: scaffold a packages/<name> and register its layer
│   ├── tsconfig.json     type-checks the two scripts above (run by packages/config check-types)
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
    ├── config/           typescript/ presets, boundaries.json (package layers), test/ preloads, turbo.json (scripts/ as task inputs)
    ├── ui-utils/         layer 0: cn, link and scroll helpers (packages-ui.md)
    ├── ui-hooks/         layer 0: React hooks (packages-ui.md)
    ├── ui-motion/        layer 0: MotionProvider, tokens, variants (packages-ui.md)
    ├── ui-primitives/    layer 1: Radix wrappers, composites, surface classes (packages-ui.md)
    ├── ui-toast/         layer 1: the sonner Toaster (packages-ui.md)
    ├── ui-forms/         layer 2: form, calendar, date picker, command, multi-select (packages-ui.md)
    ├── ui-carousel/      layer 2: Embla carousel and useEmblaState (packages-ui.md)
    ├── storage/src       index.ts -> storage.ts, storage.interface.ts, s3.factory.ts
    └── logger/src        index.ts (Logger class + logger singleton)
```

### Root scripts

| script | runs | use it when |
| --- | --- | --- |
| `dev` | `turbo run dev` (only `apps/web`: `next dev --turbopack`) | running the site locally |
| `build` | `turbo run build` (only `web` has a `build` script); `turbo run build --filter=web` is the same | production build |
| `check` | `bash scripts/check.sh` (steps in Run) | before you call work done |
| `check-boundaries` | `bun run scripts/check-boundaries.ts` | package layer violations only; prints `file:line  rule  message`, exits 1 on any |
| `new-package` | `bun run scripts/new-package.ts <name> --layer <n> [--dom] [--tests] [--css]` | extracting code into a new package (Recipes) |
| `check-types` | `turbo run check-types` | type errors only |
| `lint` / `lint:fix` | `turbo run lint` / `turbo run lint:fix` | lint, or autofix |
| `test` | `turbo run test` (`bun test` in the eleven workspaces that have specs: web, db, logger, storage, ui, ui-utils, ui-hooks, ui-motion, ui-primitives, ui-forms, ui-carousel) | running all suites |
| `generate` | `bun run --filter '@byte-of-me/db' generate` (`prisma generate`) | after a Prisma schema change |
| `postinstall` / `prepare` | `bun run generate` / `husky install` | install time; `prepare` points `core.hooksPath` at `.husky` |
| `gen:icons` | `bun run scripts/gen-icons.ts` | after editing `brand-mark.ts` |
| `format` / `format:check` | `prettier --write` / `--check` on `{apps,packages}/*/src/**` | see Gotchas |

### Turbo graph (`turbo.json`, Turbo 2.11.7)

- `build` outputs `.next/**` minus `.next/cache` and `.next/dev`; inputs add `.env*`. Web's build reads its packages from source (`transpilePackages`, derived from the workspace in `apps/web/next.config.js`), so there is no dependency build to wait for. No package builds a `dist/`: every `exports` map points at `src`.
- `check-types`, `lint`, `test` and `build` `dependsOn` `^transit`, and `transit` `dependsOn` `^transit`. No package has a `transit` script, so nothing runs for it, but turbo still hashes it per package (the package's files plus its dependencies' `transit` hashes). Without it a source edit in a package changed only that package's hashes: web's four tasks stayed cache hits and `bun run check` and both hooks reported green from a stale cache. Now an edit re-runs the package and every package that depends on it, directly or not, and nothing else; the tasks still run in parallel. Measured: editing `ui-utils` re-ran `ui-utils`, `ui-primitives`, `ui-forms`, `ui-carousel`, `ui` and `web` (19 of 38 tasks) and hit `ui-hooks`, `ui-motion`, `ui-toast`, `db`, `logger`, `storage` and `config`; editing only `apps/web` re-ran the four `web` tasks. A chain (`dependsOn: ["^check-types"]` and so on) was rejected: it serialises each task behind its dependencies' and a cold `bun run check` took 59.9 s against 47.6 s. `^build` alone would also invalidate (a missing script still has a hash) but would start running a package's build the day one is added.
- Files a task reads from outside its package, with no dependency on the package that owns them, are `inputs` globs relative to the repo root (`$TURBO_ROOT$`), or an edit leaves the cache green: `test` adds `$TURBO_ROOT$/packages/config/test/**` (the `bunfig.toml` preloads of seven workspaces) and `packages/config/turbo.json` (extends `//`) adds `$TURBO_ROOT$/scripts/**` to config's `check-types` and `lint`.
- Local cache cap: `cacheMaxSize` `5GB` and `cacheMaxAge` `14d` (eviction runs at the start of each `turbo run`). Without them the cache never shrinks, and the web build entry is about 6 MB compressed.
- Vercel: `apps/web/vercel.json` sets `framework` (nextjs), `buildCommand` (`cd ../.. && bunx turbo run build --filter=web`), `ignoreCommand` and `regions` (`hnd1`, Tokyo, next to Supabase in `ap-northeast-1`). The file is read from the Root Directory, so the dashboard's Root Directory must be `apps/web`; the repo cannot show that setting. `ignoreCommand` runs `turbo query affected` and skips the build (exit 0) when no package affects `web`; any other result builds. Vercel's install step is left to auto-detection (bun.lock).
- `generate` dependsOn `^generate`. Nothing besides `generate`, `transit` and the four tasks above has a dependsOn.
- `cache: false` on `dev`, `lint:fix`, `generate`, all `db:*`; `persistent` on `dev` and `db:migrate:dev`.
- `globalDependencies`: `eslint.config.mjs`, `packages/config/typescript/*.json`. `db:*` have no root script: `bun run --filter '@byte-of-me/db' db:push`.

### Git hooks

| hook | runs | fails the git operation when |
| --- | --- | --- |
| `pre-commit` | `./node_modules/.bin/turbo run check-types lint` | any type or lint error |
| `commit-msg` | removes `Co-authored-by:` and attribution lines (`Generated/Made/Created with/by`), then `npx commitlint --edit` | message breaks Conventional Commits |
| `pre-push` | `./node_modules/.bin/turbo run test build` | any test or build failure |

### packages/config (presets, package layers, test preloads)

- `typescript/base.json`: `strict`, `esModuleInterop`, `skipLibCheck`, `resolveJsonModule`. Extended by the presets below; `packages/db` extends it directly.
- `typescript/nextjs.json` (extends base): ESNext modules, `moduleResolution: node`, ES2023, `jsx: preserve`, `noEmit`, `isolatedModules`, Next plugin. Used by `apps/web`, `packages/ui`.
- `typescript/node-library.json` (extends base): `module: commonjs`, ES2019. Used by `packages/storage`, `packages/logger`.
- `typescript/library.json` (extends base): ESNext modules, `moduleResolution: bundler`, ES2023, DOM libs, `jsx: react-jsx`, `noEmit`, `isolatedModules`; no `incremental`, no Next plugin. The preset `new-package` gives every new package; used by `packages/ui-utils`, `packages/ui-hooks`, `packages/ui-motion`, `packages/ui-primitives`, `packages/ui-toast`, `packages/ui-forms`, `packages/ui-carousel`.
- `boundaries.json`: `layers` (package names per layer, index = layer), `dbTypesOnly`, `noReact`. Read by `check-boundaries.ts` and rewritten by `new-package.ts`. Rules: [../architecture.md](../architecture.md) ("Package layers").
- `test/happydom.ts`: registers happy-dom on `globalThis` and sets `IS_REACT_ACT_ENVIRONMENT`. Preloaded by `apps/web`, `packages/ui`, `packages/ui-hooks`, `packages/ui-primitives`, `packages/ui-forms` and `packages/ui-carousel`.
- `test/db-guard.ts`: forces `DATABASE_URL` and `DIRECT_URL` to `postgres://test:test@127.0.0.1:1/test`, then throws if either is non-local. Preloaded by `apps/web` and `packages/db`; details in [packages-db.md](packages-db.md).
- The package has its own `check-types` (the preloads and `scripts/tsconfig.json`) and `lint` (the preloads and the two scripts), so they run in `turbo run check-types lint` and the pre-commit hook. Its `turbo.json` adds `scripts/**` to both tasks' inputs, and the root `turbo.json` adds `test/**` to every package's `test` inputs, so an edit to either re-runs the tasks that read it.

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
| `postgres` | `postgres:17.6` | `127.0.0.1:5432:5432` |
| `mailpit` | `axllent/mailpit:v1.31.4` | `127.0.0.1:1025:1025`, `127.0.0.1:8025:8025` |

Ports bind to loopback only, so a laptop on public Wi-Fi does not expose the database (`admin` / `secret`) or the mail inbox.

## Key flows

- `bun run check` -> `scripts/check.sh`: `turbo run check-types` -> `lint` -> `bun run check-boundaries` -> `turbo run test` -> `build`; `set -e` stops at the first failing step.
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

**Add a package**
1. `bun run new-package <name> --layer <n>` (`--dom` for a React package with specs, `--tests` for specs without a DOM, `--css` for a package that imports CSS). It writes `packages/<name>/{package.json,tsconfig.json,README.md,src/index.ts}`, lists the name in `packages/config/boundaries.json` and adds `"@byte-of-me/<name>": "workspace:*"` to `apps/web/package.json`.
2. `git mv` the code into `src/`, give `package.json` its third-party dependencies (`catalog:` when the root catalog has the entry), run `bun install`.
3. `transpilePackages` and the Tailwind `content` glob (`../../packages/*/src/**/*.{ts,tsx}`) pick the package up from the workspace. Nothing to edit.
4. Add a row to `docs/README.md` ("Keeping these docs current"), then `bun run check`.

**Add a `Storage` operation**
1. Add the method to `packages/storage/src/storage.ts`, following `copyFileFrom` (line 91).
2. Add new types to `packages/storage/src/storage.interface.ts`; `src/index.ts` re-exports them.
3. Test with the injected `mockClient` in `packages/storage/__tests__/storage.spec.ts`. Example: the `copyFileFrom` test (line 149).

## Gotchas

- Editing `eslint.config.mjs` or `packages/config/typescript/*.json` misses every task's cache (`globalDependencies`). Editing a package's source misses that package's tasks and its dependants' (`transit`), never an unrelated package's; a new package joins the graph through its `package.json` dependencies, with no `turbo.json` change.
- `check-types`, `lint`, `test` and `build` have no `dependsOn` on `generate`, and no `build` script runs `prisma generate` any more (the db one did). Run `bun run generate` after a schema change; `postinstall` runs it too.
- `bun test` exits non-zero when it finds no specs, so `new-package` adds a `test` script only with `--tests` or `--dom`.
- The root package declares `typescript` (catalog) because `check-boundaries.ts` imports the compiler API; Bun's isolated linker does not hoist it from a workspace.
- `no-explicit-any`, `no-console` (`eslint.config.mjs:98-100`) and `simple-import-sort` are `warn`; no lint script passes `--max-warnings`, so `bun run lint` passes with them.
- Root `format` and `format:check` run the `prettier` in the root `devDependencies` (`^2.8.8`), so keep it there. `.prettierignore` excludes `packages/db/src/generated`, which `prisma generate` rewrites.
- `LOG_LEVEL` is never read: the level is `NODE_ENV === 'production' ? 'info' : 'debug'`, so the "Invalid LOG_LEVEL" branch (`packages/logger/src/index.ts:10-13`) cannot fire.
- The logger level is module-global (`src/index.ts:7`): `setLogLevel` on any instance changes all of them. Each entry is multi-line pretty JSON.
- `copyFileFrom` uses `encodeURI`, which leaves `#`, `?`, `&` and `+` unencoded although its docblock warns about `#`. No caller exists in the repo; the spec covers only a space (`storage.spec.ts:149`).
- `getPublicUrl` does not encode the key (`storage.ts:104`). Media keys are safe because `buildMediaFileKey` uses a generated ID (`apps/web/src/entities/media/model/media-file-key.ts`).

## Run

```sh
bun run check          # full gate: the five steps below, fail-fast
bun run check-types
bun run lint           # bun run lint:fix to autofix
bun run check-boundaries
bun run test
bun run build
bun run dev            # apps/web only
bun run gen:icons      # after editing brand-mark.ts
bun run generate       # after a Prisma schema change
```

`bun run check` runs `scripts/check.sh`: `turbo run check-types`, `turbo run lint`, `bun run check-boundaries`, `turbo run test`, `turbo run build`.

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
