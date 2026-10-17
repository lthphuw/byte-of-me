# Tooling and small packages

> Root toolchain (scripts, Turbo, git hooks, lint and format, Node pin, docker-compose) and the `config`, `api-core`, `contracts`, `query`, `github`, `storage` and `logger` packages. Source: `package.json`, `turbo.json`, `eslint.config.mjs`, `scripts/`, `.husky/`, `.commitlintrc.json`, `.prettierrc.json`, `.editorconfig`, `.nvmrc`, `.vercelignore`, `docker-compose.yml`, `packages/config`, `packages/api-core`, `packages/contracts`, `packages/query`, `packages/github`, `packages/storage`, `packages/logger`.

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
│   ├── tsconfig.json     type-checks the three TypeScript scripts (run by packages/config check-types)
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
    ├── api-core/         layer 1: ApiResponse, parseInput, pagination, cache tags and the pure helpers around them (below)
    ├── github/           layer 1: GitHub pull request fetch, parse, grouping and the ledger helpers, no dependency (below)
    ├── rich-text-schema/ layer 1: the TipTap render schema, sanitize, rich-text-content (packages-ui.md)
    ├── ui-primitives/    layer 1: Radix wrappers, composites, surface classes (packages-ui.md)
    ├── ui-toast/         layer 1: the sonner Toaster (packages-ui.md)
    ├── ui-forms/         layer 2: form, calendar, date picker, command, multi-select (packages-ui.md)
    ├── ui-carousel/      layer 2: Embla carousel and useEmblaState (packages-ui.md)
    ├── rich-text-render/ layer 2: the server-side renderer of rich text, mermaid and math leaves (packages-ui.md)
    ├── contracts/        layer 2: the entities' zod schemas, query-key factories, upload constraints, cache-tag maps (below)
    ├── query/            layer 2: useServerMutation, the list and edit hooks, QueryState, the query client (below)
    ├── rich-text-editor/ layer 3: the TipTap editor and the drawer it uses (packages-ui.md)
    ├── ui/               layer 4: the facade that re-exports the TipTap-free UI packages (packages-ui.md)
    ├── storage/          layer 0: src/index.ts -> storage.ts, storage.interface.ts, s3.factory.ts (below)
    ├── logger/           layer 0: src/index.ts (Logger class + logger singleton) (below)
    └── db/               layer 1: Prisma schema, migrations, client (packages-db.md)
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
| `test` | `turbo run test` (`bun test` in the seventeen workspaces that have specs: web, api-core, contracts, query, github, db, logger, storage, rich-text-editor, rich-text-schema, rich-text-render, ui-utils, ui-hooks, ui-motion, ui-primitives, ui-forms, ui-carousel) | running all suites |
| `generate` | `bun run --filter '@byte-of-me/db' generate` (`prisma generate`) | after a Prisma schema change |
| `postinstall` / `prepare` | `bun run generate` / `husky install` | install time; `prepare` points `core.hooksPath` at `.husky` |
| `gen:icons` | `bun run scripts/gen-icons.ts` | after editing `brand-mark.ts` |
| `format` / `format:check` | `prettier --write` / `--check` on `{apps,packages}/*/src/**` | see Gotchas |

### Turbo graph (`turbo.json`, Turbo 2.11.7)

- `build` outputs `.next/**` minus `.next/cache` and `.next/dev`; inputs add `.env*`. Web's build reads its packages from source (`transpilePackages`, derived from the workspace in `apps/web/next.config.js`), so there is no dependency build to wait for. No package builds a `dist/`: every `exports` map points at `src`.
- `check-types`, `lint`, `test` and `build` `dependsOn` `^transit`, and `transit` `dependsOn` `^transit`. No package has a `transit` script, so nothing runs for it, but turbo still hashes it per package (the package's files plus its dependencies' `transit` hashes). Without it a source edit in a package changed only that package's hashes: web's four tasks stayed cache hits and `bun run check` and both hooks reported green from a stale cache. Now an edit re-runs the package and every package that depends on it, directly or not, and nothing else; the tasks still run in parallel. Counted from the package graph at 20 workspaces (58 tasks: 20 `check-types`, 20 `lint`, 17 `test`, 1 `build`; not a turbo run): editing `ui-utils` re-runs 33 of them, in `ui-utils`, `ui-primitives`, `ui-forms`, `ui-carousel`, `rich-text-schema`, `rich-text-render`, `rich-text-editor`, `ui`, `query`, `contracts` and `web`, and leaves `ui-hooks`, `ui-motion`, `ui-toast`, `api-core`, `github`, `db`, `logger`, `storage` and `config` as cache hits; editing only `apps/web` re-runs the four `web` tasks. A chain (`dependsOn: ["^check-types"]` and so on) was rejected: it serialises each task behind its dependencies' and a cold `bun run check` took 59.9 s against 47.6 s. `^build` alone would also invalidate (a missing script still has a hash) but would start running a package's build the day one is added.
- Files a task reads from outside its package, with no dependency on the package that owns them, are `inputs` globs relative to the repo root (`$TURBO_ROOT$`), or an edit leaves the cache green: `test` adds `$TURBO_ROOT$/packages/config/test/**` (the `bunfig.toml` preloads of eight workspaces: `web`, `db`, `query`, `rich-text-editor`, `ui-hooks`, `ui-primitives`, `ui-forms`, `ui-carousel`) and `packages/config/turbo.json` (extends `//`) adds `$TURBO_ROOT$/scripts/**` to config's `check-types` and `lint`.
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

Neither hook runs `check-boundaries`: a layer violation passes both and is caught only by `bun run check`.

### packages/config (presets, package layers, test preloads)

- `typescript/base.json`: `strict`, `esModuleInterop`, `skipLibCheck`, `resolveJsonModule`. Extended by the presets below; `packages/db` extends it directly.
- `typescript/nextjs.json` (extends base): ESNext modules, `moduleResolution: node`, ES2023, `jsx: preserve`, `noEmit`, `isolatedModules`, Next plugin. Used by `apps/web`.
- `typescript/node-library.json` (extends base): `module: commonjs`, ES2019. Used by `packages/storage`, `packages/logger`.
- `typescript/library.json` (extends base): ESNext modules, `moduleResolution: bundler`, ES2023, DOM libs, `jsx: react-jsx`, `noEmit`, `isolatedModules`; no `incremental`, no Next plugin. The preset `new-package` gives every new package; used by `packages/api-core`, `packages/contracts`, `packages/query`, `packages/github`, `packages/ui`, `packages/ui-utils`, `packages/ui-hooks`, `packages/ui-motion`, `packages/rich-text-schema`, `packages/ui-primitives`, `packages/ui-toast`, `packages/ui-forms`, `packages/ui-carousel`, `packages/rich-text-render`, `packages/rich-text-editor`, `packages/config` and `scripts/tsconfig.json`.
- `boundaries.json`: `layers` (package names per layer, index = layer), `dbTypesOnly`, `noReact`. Read by `check-boundaries.ts` and rewritten by `new-package.ts`. Rules: [../architecture.md](../architecture.md) ("Package layers").
- `test/happydom.ts`: registers happy-dom on `globalThis` and sets `IS_REACT_ACT_ENVIRONMENT`. Preloaded by `apps/web`, `packages/rich-text-editor`, `packages/query`, `packages/ui-hooks`, `packages/ui-primitives`, `packages/ui-forms` and `packages/ui-carousel`.
- `test/db-guard.ts`: forces `DATABASE_URL` and `DIRECT_URL` to `postgres://test:test@127.0.0.1:1/test`, then throws if either is non-local. Preloaded by `apps/web` and `packages/db`; details in [packages-db.md](packages-db.md).
- The package has its own `check-types` (the preloads and `scripts/tsconfig.json`) and `lint` (the preloads and the three scripts: `check-boundaries.ts`, `gen-icons.ts`, `new-package.ts`), so they run in `turbo run check-types lint` and the pre-commit hook. Its `turbo.json` adds `scripts/**` to both tasks' inputs, and the root `turbo.json` adds `test/**` to every package's `test` inputs, so an edit to either re-runs the tasks that read it.

### packages/api-core public API

The framework-agnostic core of the server-action API: no `react`, no `next/*`, no `@/` alias (`noReact` in `boundaries.json`). Layer 1, not 0, because `parseInput` logs through `logger` (layer 0). Dependencies are `zod` (catalog) and `@byte-of-me/logger`. 81 specs in 8 files, none needs a DOM; run them with `bun test` from the package.

The root `src/index.ts` is client-safe: it pulls neither `logger` (chalk) nor `node:*`, so a `'use client'` file may import it. `./server` (`src/server.ts`) is for server code only. Measured after the move: the built client chunks under `.next/static` hold no `chalk` and no `node:net`, as before.

| export | shape | notes |
| --- | --- | --- |
| `ApiResponse<T, TErrorCode>` (type) | `{ success: true, data }` or `{ success: false, errorMsg, errorCode? }` | `api-response.type.ts`; `errorMsg` is an English fallback, `errorCode` the reason a caller can translate |
| `PaginatedData<T>`, `PaginatedParams` (types) | page of rows plus `currentPage`, `totalPages`, `totalCount`, `hasMore` | `paginated-api.type.ts`, which also holds `PaginatedMetadata`, the `meta` shape, not exported from the root |
| `clampPagination` | `(params, { defaultLimit = 12, maxLimit = 50, maxPage }?)` -> `{ page, limit }` | `pagination.ts`; `MAX_PAGE` (100 000) is not exported from the root |
| `buildPaginatedMeta` | `({ page, limit, totalCount })` -> `PaginatedMetadata` | `pagination.ts` |
| `MAX_CACHED_PAGE` | `50` | deepest page a public list stores in the data cache |
| `unwrapApiResponse`, `ServerActionError` | returns `data`, or throws `ServerActionError(errorMsg, errorCode)` | `unwrap-api-response.ts` |
| `cuidSchema`, `slugSchema`, `slugListSchema`, `searchTextSchema`, `MAX_FILTER_SLUGS` | zod for what an anonymous caller sends | `public-input-schema.ts` (the slug and search length limits, 64 and 100, are file-private) |
| `safeHttpUrl`, `isSafeHttpUrl`, `toSafeHref` | http(s)-only URL (zod, predicate, render-time `null`) | `safe-http-url.ts` |
| `getTranslationLanguages`, `getTranslatedContent` | the `{ in: [locale, 'en'] }` filter; locale, then `en`, then the first row | `i18n-utils.ts` |
| `parsePageParam`, `parseSlugListParam`, `searchHistoryMode`, `FilterHistoryMode`, `FilterNavigationOptions` | URL filter parsing for the list pages | `filter-params.ts` |
| `normalizeEmail` | trim and lowercase; `''` for an absent address | `normalize-email.ts` |
| `CACHE_TAGS`, `INTERACTION` | 14 `revalidateTag` tags; `LIKE`, `CLAP` | `constants.ts` |
| `parseInput`, `idSchema` (`./server`) | `parseInput(schema, data, context?)` -> `{ ok: true, data }` or `{ ok: false, errorMsg, errorCode: 'invalid', detail }` | `validate-action-input.ts`; logs a `warn` through `logger`; `detail` is for logs and admin surfaces |
| `getClientIp` (`./server`) | `(headers)` -> the first valid IP of `x-vercel-forwarded-for`, `x-real-ip`, `x-forwarded-for`, else `'unknown'` | `client-ip.ts`, imports `node:net` |

`LAYOUT_CACHE_REVALIDATE_SECONDS` and `PATHNAME_HEADER` stayed in `apps/web/src/shared/lib/constants.ts`: they are app wiring, not API.

### packages/contracts public API

The pure half of each entity, moved out of `apps/web/src/entities/*/model/` and `shared/lib`: 31 source files and 14 specs (118 tests, none needs a DOM; run them from `packages/contracts`). Layer 2, `sideEffects: false`, on both the `noReact` and `dbTypesOnly` lists. Dependencies are `zod`, `@byte-of-me/api-core` (root only) and the light `@byte-of-me/rich-text-schema` subpaths, so any subpath is safe in a `'use client'` file. `entities/*/model/types.ts`, the `admin-*-include.ts` files and `media-file-key.ts` (it needs `nanoid`) stay in `apps/web`.

One subpath per entity that has something to export, each `src/<slice>/index.ts` an `export *` of its files:

| subpath | files | exports |
| --- | --- | --- |
| `.` | `rich-text-doc-schema.ts`, `image-compression-config.ts`, `image-compression-rules.ts` | `richTextDocSchema`, `RichTextDoc` (blog and user-profile); `imageCompressionConfigSchema`, `IMAGE_COMPRESSION_DEFAULTS`, `ImageCompressionConfig` (the settings row embeds it, both compressors read it); `shouldSkipCompression`, `computeTargetDimensions`, `shouldKeepOriginal` |
| `./blog` | `blog-schema.ts`, `query-keys.ts` | `blogFormSchema`, `publicBlogsParamsSchema`, `relatedPublicBlogsParamsSchema`, `MAX_RELATED_BLOGS`, `BlogFormValues`, `blogKeys` |
| `./comment` | `comment-schema.ts`, `query-keys.ts` | `publicCommentsParamsSchema`, `commentKeys` |
| `./company` | `company-schema.ts`, `query-keys.ts` | `companySchema`, `CompanyFormValues`, `companyKeys` |
| `./contact-message` | `contact-message-schema.ts`, `query-keys.ts` | `contactMessageSchema`, `createContactMessageSchema(t)`, `ContactMessageFormValues`, `MESSAGE_MAX_LENGTH`, `contactMessageKeys` |
| `./education` | `education-schema.ts`, `query-keys.ts` | `educationSchema`, `EducationFormValues`, `educationKeys` |
| `./featured-work` | `featured-work-schema.ts`, `query-keys.ts` | `featuredWorkSchema`, the `FEATURED_WORK_*` limits, `FeaturedWorkFormValues`, `featuredWorkKeys` |
| `./media` | `media-schema.ts`, `query-keys.ts`, `upload-constraints.ts` | `mediaScopeSchema`, `videoUploadRequestSchema`, `videoUploadCompletionSchema`, `mediaKeys`; the size and batch limits, `ACCEPTED_*_MIME_TYPES`, `MEDIA_SCOPES` / `MediaScope`, `findUploadViolation`, `pickUploadPath`, `detectMediaMimeType` / `resolveUploadedMimeType` (byte signatures), `sanitizeStoredFileName`, `MediaViolationError` |
| `./project` | `project-schema.ts`, `public-project-schema.ts`, `query-keys.ts` | `projectSchema`, `ProjectFromValues`, `publicProjectsParamsSchema`, `PublicProjectFilters`, `projectKeys` |
| `./tag` | `tag-schema.ts`, `query-keys.ts`, `revalidation.ts` | `tagSchema`, `TagFormValues`, `tagKeys`, `TAG_MUTATION_TAGS` (TAG, BLOG, PROJECT) |
| `./tech-stack` | `tech-stack-schema.ts`, `query-keys.ts`, `revalidation.ts` | `techStackSchema`, `TechStackFormValues`, `techStackKeys`, `TECH_MUTATION_TAGS` (TECH, PROJECT) |
| `./user-profile` | `user-profile-schema.ts`, `query-keys.ts` | `userProfileSchema`, `createUserProfileSchema(t)`, `UserProfileFormValues`, `userProfileKeys` |
| `./workspace-settings` | `settings-schema.ts`, `query-keys.ts` | `workspaceSettingsPatchSchema`, `parseWorkspaceSettings`, `WORKSPACE_SETTINGS_DEFAULTS`, `WorkspaceSettings`, `WorkspaceSettingsPatch`, `workspaceSettingsKeys` |

`social-link` has no subpath: its `model/` holds types only. `open-source` has none either; its types and ledger helpers are in `@byte-of-me/github`.

Measured after the move (`next start`): the built client chunks under `.next/static` hold no `chalk` and no `node:net`, as before; `/en/blogs` and `/en/projects` show content, not skeletons, after hydration, and `/en/projects` makes no client action call because the server-prefetched query keys match.

### packages/query public API

The client-state code that needs TanStack Query and nothing from the app, moved out of `apps/web/src/shared/{hooks,lib/query,ui}`: 7 source files and 3 specs (21 tests; run them from `packages/query`, where `bunfig.toml` preloads happy-dom). Layer 2, `sideEffects: false`. `react`, `react-dom`, `@tanstack/react-query` and `sonner` are peers (catalog entries, also dev dependencies), so the app and the package resolve one install of each; the dependencies are `api-core`, `ui-hooks` and `ui-primitives`. Each hook file carries its own `'use client'`, so the root can be imported from a server component for `getQueryClient` and the two constants.

| export | shape | notes |
| --- | --- | --- |
| `useServerMutation` | `({ mutationFn, errorMessage?, errorMessages?, successMessage?, invalidate?, onSuccess? })` -> the `useMutation` result | the one client write path: unwraps the envelope, invalidates the `invalidate` keys and runs `onSuccess` only on success; a failure logs with `console.error` and toasts `errorMessages[errorCode]`, else `errorMessage`; a `NEXT_REDIRECT;` rejection is silent. `use-server-mutation.ts` |
| `useInfiniteListQuery`, `HYDRATED_LIST_BEHAVIOR`, `InfiniteListQueryBehavior` | `({ queryKey, fetchPage, ...behavior })`; `staleTime: Infinity` and no focus refetch | paginated lists; the behaviour constant is for a list the server prefetched. `use-infinite-list-query.ts` |
| `useEditingRecord` | `({ id, queryKey, fetchRecord })` -> `{ record, isNotReady, hasError, retry }` | the full record behind an admin list row; mount the form only once `record` is set. `use-editing-record.ts` |
| `useUrlSyncedSearch` | `({ urlSearch, onCommit, delay? })` -> `{ search, setSearch, resetSearch }` | a search box whose term lives in the URL: debounced write out, re-sync in, `lastWritten` ignores the echo of its own write. No `next/*`; the caller owns the navigation. `use-url-synced-search.ts` |
| `QueryState` | skeleton while loading, error with Retry, empty, then children; a corner spinner while refetching | every string comes from the caller; draws `StateBlock` and `ContentFade` from `ui-primitives`. `query-state.tsx` |
| `makeQueryClient`, `getQueryClient` | `staleTime` 60 s, `retry` 0 on the server and 1 in the browser; the second is `cache(makeQueryClient)` | server prefetch and the client provider share the defaults. `get-query-client.ts` |
| `ADMIN_PAGE_SIZE` (12), `ADMIN_OPTIONS_LIMIT` (500) | numbers | the page size is not in the admin query key, so a prefetch and `useCrudManager` that disagree hydrate the wrong rows. `admin-list.ts` |

Stayed in `apps/web/src/shared/hooks/`: `useCrudManager` (next-intl, toasts from `dashboard.shared.crud`) and `useEditorLabels` (next-intl). `StateBlock` and `ContentFade` went to `ui-primitives`, not here: they are cn-only leaves that `SectionLoadError` and `EditRecordGate` draw too.

### packages/github public API

The pure GitHub pull request code, moved out of `apps/web/src/entities/open-source/{lib,model}` and `entities/featured-work/lib`: 8 source files (two of them `types.ts`, one per slice) and 5 specs (32 tests, no DOM; run them from `packages/github`). Layer 1 with no dependency, on the `noReact` list, `sideEffects: false`. No `@/` alias and no env read: every fetch takes its token as an argument.

| export | shape | notes |
| --- | --- | --- |
| `fetchMergedPullRequests` | `(login, token)` -> `GithubPullRequestNode[]` | GraphQL search, 100 a page, 5 pages at most, 8 s timeout; throws on any transport or GraphQL error. `open-source/fetch-merged-pull-requests.ts` |
| `groupByRepo` | `(nodes)` -> `OpenSourceRepo[]` | most merged PRs first, ties by lines changed, newest PR first within a repo. `open-source/group-by-repo.ts` |
| `toLedger`, `filterLedger`, `pageLedger`, `groupLedgerByMonth`, `LEDGER_PAGE_SIZE` | the flat `/projects` list: newest first, text and repo filter, page of 5 (phone) or 8, runs by UTC month | `open-source/ledger.ts` |
| `parseGithubPullRequestUrl` | `(url)` -> `GithubPullRequestRef` or `null` | `github.com` or `www.github.com`, `http(s)`, a number past GraphQL's `Int` is refused. `featured-work/parse-github-pull-request-url.ts` |
| `fetchFeaturedWorkGithub` | `(refs, token, fetchImpl?)` -> `Array<FeaturedWorkGithub \| null>` | one batched query with variables, never string interpolation; an empty batch sends nothing; partial `data` is used. `featured-work/fetch-featured-work-github.ts` |
| `OpenSourceRepo`, `GithubPullRequestRef`, `FeaturedWorkGithub`, `FeaturedWorkPullRequestState` (types) | | `open-source/types.ts`, `featured-work/types.ts`; the entity's `PublicFeaturedWorkLink.github` is a `FeaturedWorkGithub` |

Stayed in `apps/web`: `get-open-source-contributions.ts`, `get-featured-work-github.ts` and `load-public-featured-works.ts`, which read `env`, log and go through `@/shared/api` (the data cache) or Prisma.

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
| `LogLevel` (type, file-private) | `'debug'`, `'info'`, `'warn'`, `'error'`, `'silent'` | `silent` suppresses everything |

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
- API core: a server action imports `parseInput` from `@byte-of-me/api-core/server` and `ApiResponse`, `CACHE_TAGS` from `@byte-of-me/api-core`; a client query imports `unwrapApiResponse` from the root. 142 files in `apps/web` import it, 131 of them outside specs (50 use `./server`; `rg -l "@byte-of-me/api-core" apps/web -g '!node_modules'`).
- Contracts: a server action imports its schema from `@byte-of-me/contracts/<slice>` and parses it with `parseInput`; the client form's resolver and the `<slice>Queries` `queryOptions` factory import the same subpath, so the schema and the query key have one definition.
- Query: a client write calls `useServerMutation` from `@byte-of-me/query`; a client read is a `queryOptions` factory in `entities/<slice>/query/` whose hook calls `useInfiniteListQuery` or `useEditingRecord` from the same package; a server page prefetches with `getQueryClient`. The query key of each comes from `@byte-of-me/contracts/<slice>`.
- GitHub: `getOpenSourceContributions` calls `fetchMergedPullRequests` and `groupByRepo`; `getFeaturedWorkGithub` calls `fetchFeaturedWorkGithub`; `load-public-featured-works.ts` calls `parseGithubPullRequestUrl`. `projects-open-source.tsx` (client) takes the ledger helpers from the same root.
- Storage: `apps/web/src/shared/api/s3-storage-api.ts` (`supabaseStorage = new Storage(...)`) -> `packages/storage/src/storage.ts` -> S3 client. Callers: `apps/web/src/entities/media/api/`.
- Logger: `packages/logger/src/index.ts` -> level gate -> `console.*`. Imported by `apps/web` and `packages/db/src/index.ts`.

## Recipes

**Add a root script**
1. Add it to `scripts` in `package.json`. Example: `gen:icons` -> `scripts/gen-icons.ts`.
2. To run per workspace through Turbo, add a task to `turbo.json` and define the script in each workspace. Example: `lint:fix` (`cache: false`).
3. Add it to `scripts/check.sh` only if it belongs in the gate.

**Change the brand mark or favicon**
1. Edit `apps/web/src/shared/lib/brand-mark.ts`. `FAVICON_FILES` decides which SVGs are generated.
2. Run `bun run gen:icons`.
3. Commit the regenerated `apps/web/public/` files with `scripts/icons.lock.json`. Verify with `bun run --filter 'web' test` (runs `icon-set.spec.ts`).

**Add a package**
1. `bun run new-package <name> --layer <n>` (`--dom` for a React package with specs, `--tests` for specs without a DOM, `--css` for a package that imports CSS). It writes `packages/<name>/{package.json,tsconfig.json,README.md,src/index.ts}`, lists the name in `packages/config/boundaries.json` and adds `"@byte-of-me/<name>": "workspace:*"` to `apps/web/package.json`.
2. `git mv` the code into `src/`, give `package.json` a one-sentence `description` (after `private`) and its third-party dependencies (`catalog:` when the root catalog has the entry), run `bun install`. Every `packages/*/package.json` keeps the scaffold's key order: `name`, `version`, `private`, `description`, `type`, `exports`, `scripts`, `sideEffects`, `peerDependencies`, `dependencies`, `devDependencies` (`db` has no `sideEffects` on purpose: its index runs `dotenv/config` and builds the client at import; `config` has no `exports`).
3. `transpilePackages` and the Tailwind `content` glob (`../../packages/*/src/**/*.{ts,tsx}`) pick the package up from the workspace. Nothing to edit.
4. Add a row to `docs/README.md` ("Keeping these docs current"), then `bun run check`.

**Add a `Storage` operation**
1. Add the method to `packages/storage/src/storage.ts`, following `copyFileFrom`.
2. Add new types to `packages/storage/src/storage.interface.ts`; `src/index.ts` re-exports them.
3. Test with the injected `mockClient` in `packages/storage/__tests__/storage.spec.ts`. Example: the `copyFileFrom URL-encodes the source` test.

## Gotchas

- Editing `eslint.config.mjs` or `packages/config/typescript/*.json` misses every task's cache (`globalDependencies`). Editing a package's source misses that package's tasks and its dependants' (`transit`), never an unrelated package's; a new package joins the graph through its `package.json` dependencies, with no `turbo.json` change.
- `check-types`, `lint`, `test` and `build` have no `dependsOn` on `generate`, and no `build` script runs `prisma generate` any more (the db one did). Run `bun run generate` after a schema change; `postinstall` runs it too.
- `bun test` exits non-zero when it finds no specs, so `new-package` adds a `test` script only with `--tests` or `--dom`.
- A client file imports `@byte-of-me/api-core` (the root) only. `./server` reaches `logger` and `node:net`; keep both out of the root, or the public bundle gets `chalk`.
- A query-key factory in `packages/contracts` is a contract with the server prefetch that uses it: a changed shape leaves the prefetched page unhydrated, raises no error and shows skeletons. Change a factory only with every prefetch and `invalidate` that calls it; `apps/web/src/entities/admin-query-keys.spec.tsx` checks the admin ones through real TanStack behaviour.
- `contracts` has no `@/` alias, so `Maybe<T>` and the other globals of `apps/web/src/shared/types` are not available there; write `T | null | undefined`.
- The root package declares `typescript` (catalog) because `check-boundaries.ts` imports the compiler API; Bun's isolated linker does not hoist it from a workspace.
- `no-explicit-any` is `error`; `no-console` and `simple-import-sort` (both in `eslint.config.mjs`) are `warn`, and no lint script passes `--max-warnings`, so `bun run lint` passes with warnings. `scripts/gen-icons.ts` is type-checked (`scripts/tsconfig.json`) and linted (the config package's `lint`) like the other two scripts.
- Root `format` and `format:check` run the `prettier` in the root `devDependencies` (`^2.8.8`), so keep it there. `.prettierignore` excludes `packages/db/src/generated`, which `prisma generate` rewrites.
- `LOG_LEVEL` is never read: the level is `NODE_ENV === 'production' ? 'info' : 'debug'`, so the "Invalid LOG_LEVEL" branch at the top of `packages/logger/src/index.ts` cannot fire.
- The logger level is module-global (`currentLevel` in `src/index.ts`): `setLogLevel` on any instance changes all of them. Each entry is multi-line pretty JSON.
- `copyFileFrom` uses `encodeURI`, which leaves `#`, `?`, `&` and `+` unencoded although its docblock warns about `#`. No caller exists in the repo; the spec covers only a space (the `copyFileFrom URL-encodes the source` test in `storage.spec.ts`).
- `getPublicUrl` does not encode the key. Media keys are safe because `buildMediaFileKey` uses a generated ID (`apps/web/src/entities/media/model/media-file-key.ts`).

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

None in this area. §11.14 (three lines per comment block) holds for `scripts/`, `.husky/` and the packages here since the comment pass (a parser-based scan of the TypeScript, CSS and shell files finds no block over three lines); the one known exception is the `///` block above `WorkspaceSettings` in `schema.prisma` (see [packages-db.md](packages-db.md)).

## See also

- [web-shared.md](web-shared.md): the storage instance and brand-mark sources under `apps/web/src/shared`.
- [packages-db.md](packages-db.md): `@byte-of-me/db` (`generate`, `db:*` scripts).
- [../architecture.md](../architecture.md): system diagrams.
- [root README](../../README.md).
