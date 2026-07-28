# Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all findings from the 2026-07-27 five-dimension audit (security, data-loss bugs, architecture debt, performance, tooling) — everything except CI setup (item 32, Vercel handles CI/CD).

**Architecture:** Work happens on branch `audit/remediation` off `main`. Ten phases ordered so correctness/security fixes land first, schema migrations are batched (one migration for fixes+indexes, one for translation-feature drop), and refactors that touch many files (barrels, query keys, translation reads) come after the contracts they depend on (ApiResponse, key factory) exist. Each phase ends with `pnpm check-types && pnpm lint` and a commit; `pnpm build` + `pnpm test` at phases 2, 5, 8, 10.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + Postgres (docker-compose local), TanStack Query, next-intl, Auth.js, zod, pnpm 10 + turbo.

## Global Constraints

- Never introduce new dependencies (rate limiter is DB-based; decision confirmed by user).
- No `any`, no `@ts-ignore` — fix typing properly.
- Schema changes ARE authorized by the user for this plan (logo cascades, indexes, TagTranslation unique, RateLimit table, drop Translation + PageView).
- Translation-override feature (DB `Translation` table + dashboard translation-manager) is DELETED, not repaired (user decision).
- Surgical edits; respect FSD layering (`app → widgets → features → entities → shared`).
- Two i18n systems: next-intl JSON = static UI strings; per-entity `*Translation` tables = dynamic content. Never mix.
- Verify commands: `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm build` (turbo, from repo root).
- Local DB for migrations: `docker compose up -d` then `pnpm --filter @byte-of-me/db exec prisma migrate dev --name <name>`.
- Commit style: conventional commits (`fix:`, `refactor:`, `perf:`, `chore:`), one commit per task or coherent task group. End commit messages with the Claude co-author trailer.

---

## Phase 0: Branch setup

- [x] **Create branch `audit/remediation` from `main`.** `git checkout -b audit/remediation`

---

## Phase 1: Security hotfixes (audit items 1, 2, 3, 9, 10)

### Task 1.1: Exclude `/api` from public CDN cache header

**Files:** Modify: `apps/web/next.config.js:64-80`

- [ ] In `headers()`, change the public-cache rule source from `'/((?!.*dashboard).*)/:path*'` to also exclude `api`: use `'/((?!api|.*dashboard).*)/:path*'` (path-to-regexp negative lookahead — verify by listing which of `/api/auth/session`, `/en/blogs`, `/en/dashboard` match; only `/en/blogs` should).
- [ ] Add an explicit no-store header rule for `/api/:path*` with `Cache-Control: private, no-store` above the public rule.
- [ ] Verify: `pnpm --filter web build` succeeds; grep built config output not needed — assert via a small node script evaluating the regex `^\/((?!api|.*dashboard).*)\/.*$` against the three paths.
- [ ] Commit: `fix(security): exclude /api from public CDN cache headers`

### Task 1.2: Auth-gate `purgeEntireCache`

**Files:** Modify: `apps/web/src/shared/lib/revalidate.ts:15-31`

- [ ] Add `await requireAdmin();` as first statement inside `purgeEntireCache` (import from `@/shared/lib/auth` — check existing import convention in sibling admin actions, e.g. `apps/web/src/entities/blog/api/update-blog.ts`). Wrap so unauthenticated call returns `{ success: false, errorMsg: 'Unauthorized' }` rather than throwing raw.
- [ ] Commit: `fix(security): require admin session in purgeEntireCache`

### Task 1.3: Stop logging SQL params in production

**Files:** Modify: `packages/db/src/index.ts:28-36`

- [ ] Gate the `client.$on('query', ...)` listener registration behind `process.env.NODE_ENV !== 'production'`. Inside the listener, type the event properly (`Prisma.QueryEvent` from generated client) instead of `(e: any)` — removes one of the `: any` violations too. Keep `logger.debug` (not `info`) for query/params/duration.
- [ ] Verify: `pnpm --filter @byte-of-me/db test` passes.
- [ ] Commit: `fix(security): gate prisma query/param logging to non-production`

### Task 1.4: Harden analytics write actions

**Files:** Modify: `apps/web/src/features/public/blog-analytics/lib/update-blog-reading-time.ts`, `apps/web/src/features/public/blog-analytics/lib/track-blog-view.ts`

- [ ] `updateBlogReadingTime(logId, seconds)`: clamp `seconds` to integer `1..300` (reject otherwise, return silently — analytics best-effort); verify ownership: read the viewer cookie set by `track-blog-view` and only `update` where `{ id: logId, viewerId: <cookie value> }` via `updateMany` (count 0 = no-op). Read `track-blog-view.ts` first to learn the exact cookie name and the `viewerId` column.
- [ ] `trackBlogView`: validate `blogId`/slug param shape (zod `z.string().cuid()` or match existing id format used by schema) before writing.
- [ ] Verify: `pnpm check-types`.
- [ ] Commit: `fix(security): validate and ownership-check blog analytics writes`

### Task 1.5: Fix broken revalidate calls

**Files:** Modify: `apps/web/src/entities/comment/api/post-comment.ts:45`, `apps/web/src/features/public/toggle-blog-interactions/lib/toggle-blog-interaction.ts:44-45`

- [ ] `post-comment.ts:45`: `revalidateTag(CACHE_TAGS.COMMENT, 'profile')` → `revalidateTag(CACHE_TAGS.COMMENT, 'default')`.
- [ ] `toggle-blog-interaction.ts:44`: delete the no-op `revalidatePath('/blogs/${blogSlug}')` line (routes are `/[locale]/blogs/[slug]`; the `revalidateTag` on line 45 already covers cache purge). Leave a one-line comment only if the file's comment style warrants it.
- [ ] Commit: `fix: correct revalidateTag profile and remove no-op revalidatePath`

---

## Phase 2: Schema migration #1 — cascades, indexes, constraints, RateLimit, drop PageView (items 4, 26, 31-partial)

### Task 2.1: Schema edits

**Files:** Modify: `packages/db/prisma/schema.prisma`; Modify (reads of PageView): `apps/web/src/features/dashboard/blog-analytics-overview/lib/get-analytics-overview.ts:74-78` and the widget UI that renders page-view tiles.

**Interfaces produced:** model `RateLimitHit { key String, windowStart DateTime, count Int, @@id([key, windowStart]) }` (table `rate_limit_hits`) consumed by Task 8.1.

- [ ] `Education.logo`, `Company.logo`, `TechStack.logo` relations (`schema.prisma:166,259,315`): `onDelete: Cascade` → `onDelete: SetNull` (fields already optional; ensure the scalar `logoId` field is optional).
- [ ] `TagTranslation.name` (`schema.prisma:591`): remove `@unique` (keep `@@unique([tagId, language])`).
- [ ] `Education.sortOrder` (`schema.prisma:161`): add `@default(0)`.
- [ ] Remove the redundant `blogs(is_published, published_date)` index — keep only the `DESC` variant (`schema.prisma:518-519`).
- [ ] Add indexes: `@@index([userId, isPublished, startDate])` on Project; `@@index([blogId, type])` on Interaction; `@@index([blogId, parentId, isDeleted])` on Comment; `@@index([userId])` on Media; `@@index([userId])` on TechStack; `@@index([userId, createdAt])` on ContactMessage; `@@index([userId])` on Account; `@@index([userId])` on Session; `@@index([logoId])` on Education, Company, TechStack; `@@index([coverImageId])` on Blog; `@@index([viewerId])` on BlogStatisticLog.
- [ ] Delete model `PageView` (`schema.prisma:743-765`). Remove its reads in `get-analytics-overview.ts:74-78` and the corresponding stat tiles in the analytics-overview widget UI (find with `grep -rn "pageView\|PageView" apps/web/src`).
- [ ] Add model `RateLimitHit`: `key String`, `windowStart DateTime`, `count Int @default(1)`, `@@id([key, windowStart])`, `@@map("rate_limit_hits")`.

### Task 2.2: Generate migration + verify

- [ ] `docker compose up -d` (if DB not running), then `pnpm --filter @byte-of-me/db exec prisma migrate dev --name audit_fixes_cascades_indexes_ratelimit`.
- [ ] Inspect generated SQL: confirm `ON DELETE SET NULL` on the three logo FKs, `DROP INDEX` for `tag_translations(name)` unique and redundant blogs index, all new indexes, `DROP TABLE page_views`, `CREATE TABLE rate_limit_hits`.
- [ ] `pnpm generate && pnpm check-types && pnpm --filter @byte-of-me/db test`.
- [ ] Commit: `fix(db): SetNull logo cascades, hot-path indexes, tag-name unique, RateLimit table; drop dead PageView`

---

## Phase 3: Delete translation-override feature (item 5; user decision: remove)

### Task 3.1: Remove code

**Files:** Delete: `apps/web/src/entities/translation/` (whole slice), `apps/web/src/widgets/dashboard/translation-manager/` (whole slice), dashboard route `apps/web/src/app/[locale]/(protected)/dashboard/**/translations` page dir. Modify: `apps/web/src/shared/i18n/request.ts` (drop prisma import, `deepMerge` of dynamic messages, dead `setDeep`), layer barrels (`entities/index.ts`, `widgets/dashboard/index.ts`), dashboard nav/sidebar links, `messages/en.json` + `messages/vi.json` dashboard.translation* namespaces.

- [ ] `grep -rn "translation-manager\|entities/translation\|Translation'" apps/web/src` to enumerate every reference before deleting; remove them all (nav item, barrel exports, route page, types).
- [ ] `request.ts`: reduce `getRequestConfig` to static `messages/*.json` loading only; delete `setDeep` and the `prisma` import. If `deepMerge` (`shared/lib/deep-merge.ts`) has no remaining consumers (`grep -rn "deepMerge" apps/web/src`), delete it and its spec.
- [ ] Remove now-unused UI-string keys for the translation manager from both locale JSONs (search `"translation` in `messages/`).
- [ ] Verify: `pnpm check-types && pnpm lint && pnpm --filter web build`.

### Task 3.2: Migration #2 — drop table

- [ ] Delete model `Translation` from `schema.prisma` (and its `User` relation field). `pnpm --filter @byte-of-me/db exec prisma migrate dev --name drop_translation_override_table`. Regenerate client, `pnpm check-types`.
- [ ] Commit (both tasks): `refactor!: remove dead DB translation-override feature (table, CRUD, i18n merge)`

---

## Phase 4: Data-loss fixes — saveProfile + CRUD managers (items 6, 7)

### Task 4.1: Fix `saveProfile`

**Files:** Modify: `apps/web/src/entities/user-profile/api/save-profile.ts`

- [ ] Social-link delete (`:85-93`): replace the broken `NOT: incomingSocialLinks.map(...)` with an id-based diff: fetch existing links (`select: { id, platform, url }`), compute the set to delete as those whose `(platform)` is not among incoming, and `deleteMany({ where: { userId, platform: { notIn: incomingPlatforms } } })`. Keep the existing upsert loop for create/update so ids stay stable.
- [ ] `create` branch (`:163-174`): add the missing `greeting: t.greeting` field (mirror the `update` branch field list exactly).
- [ ] Response shape (`:200`): `{ success: false, error }` → `{ success: false, errorMsg }`; annotate the function `Promise<ApiResponse<...>>` (import from `@/shared/types/api`).
- [ ] Verify: `pnpm check-types`; manual reasoning check: two social links saved twice in a row must not delete/recreate.
- [ ] Commit: `fix: saveProfile social-link NOT-clause data loss + missing greeting on create`

### Task 4.2: Migrate 3 managers to `useCrudManager`

**Files:** Modify: `apps/web/src/widgets/dashboard/company-manager/ui/company-manager.tsx`, `.../education-manager/ui/education-manager.tsx`, `.../tech-stack-manager/ui/tech-stack-manager.tsx`. Reference implementations: `tag-manager.tsx:43`, `project-manager.tsx:41` (already on the hook), hook at `apps/web/src/shared/hooks/use-crud-manager.ts`.

- [ ] For each of the three: replace the inline `editing/open/itemToDelete` state + save/delete `useMutation` blocks with `useCrudManager` configured the same way tag-manager does (list query fn, save fn calling `create`/`update`, delete fn, entity labels). This restores `.success` checking via the hook's `unwrap()` — a `{success:false}` response must now surface an error toast and keep the dialog open.
- [ ] Keep each manager's card markup/dialog composition untouched; only the state/mutation wiring changes.
- [ ] Note: query keys will be revisited in Phase 6 — here, pass whatever key shape the hook expects consistently (a plain string like `'companies'`), NOT an array (the array form silently breaks invalidation, see item 15).
- [ ] Verify: `pnpm check-types && pnpm lint`; `pnpm --filter web build`.
- [ ] Commit: `fix: migrate company/education/tech-stack managers to useCrudManager (silent failure + ~250 dup lines)`

---

## Phase 5: API contracts, validation, response unification (items 19, 20, 21, 24-strings, 8, 28-clamp)

### Task 5.1: Pagination clamp helper

**Files:** Create: `apps/web/src/shared/lib/pagination.ts` + spec `apps/web/src/shared/lib/pagination.spec.ts`. Modify: every `get-paginated-*` action (public and admin) under `apps/web/src/entities/*/api/`.

**Interfaces produced:** `export function clampPagination(params: PaginatedParams, maxLimit = 50): { page: number; limit: number }` — `page >= 1` integer, `1 <= limit <= maxLimit`.

- [ ] Write failing spec: `clampPagination({page: 0, limit: 1_000_000})` → `{page: 1, limit: 50}`; `{page: 2.7, limit: -3}` → `{page: 2, limit: 1}` (floor + clamp); defaults preserved when in range.
- [ ] Implement; run `pnpm --filter web test` (jest testMatch covers `src/shared/lib/**/*.spec.ts`).
- [ ] Apply at the top of every paginated action (grep `findMany` + `take:` under `entities/*/api/`).
- [ ] Commit: `fix: clamp pagination params on all list endpoints`

### Task 5.2: Fix `getPaginatedPublicTags` cache key + cache-key hygiene

**Files:** Modify: `apps/web/src/entities/tag/api/get-paginated-public-tags.ts:57-59`; audit siblings.

- [ ] Include `page` and `limit` (post-clamp) in `cacheKey`, mirroring `get-paginated-public-tech-stacks.ts:47-51`. Grep all `cacheKey:` uses under `entities/*/api` and confirm every closure-captured argument is mirrored into the key; fix any other offender found.
- [ ] Also fix raw-literal tags at `get-public-info-for-footer.ts:51` → use `CACHE_TAGS.*` constants, and remove the spurious `CACHE_TAGS.PROJECT` tag from `get-public-user-profile.ts:57`.
- [ ] Commit: `fix: cache keys must include closure args; cache-tag hygiene`

### Task 5.3: `ApiResponse` return annotations + contract violators

**Files:** Modify: all un-annotated files in `apps/web/src/entities/*/api/` (38 of 76 — enumerate with `grep -rLn "ApiResponse" apps/web/src/entities/*/api/*.ts` refined by hand), specifically fixing: `entities/tech-stack/api/create-tech-stack.ts:32`, `update-tech-stack.ts:34,48` (`error` → `errorMsg`), `delete-tech-stack.ts` (bare boolean → `ApiResponse<boolean>` envelope + `logger` instead of `console.error`), education strings (`update-education.ts:31,113`, `create-education.ts:68`, `delete-education.ts:39` — replace `educationSchema`/`PublicEducation` with the word "education").

- [ ] Sweep: add `Promise<ApiResponse<T>>` to every server action missing it; let the compiler surface shape drift, fix each.
- [ ] Unify the outliers: `sendContactMessage` returns `ApiResponse` variants only (`errors` flatten → join into `errorMsg`, keep field errors available if a consumer needs them — check the consumer first: `grep -rn "sendContactMessage" apps/web/src`); `getDashboardStats`/`getAnalyticsOverview` failure → `{ success: false, errorMsg }`; `getPublicBlogStats` gets try/catch + envelope (update its consumer `blog-live-stats.tsx:20` to unwrap); `postComment` stops throwing — return `{ success:false, errorMsg }` on validation/DB failure (update consumer `blog-comment-section.tsx` optimistic flow accordingly).
- [ ] Replace remaining `console.error` in the API layer with `logger.error` (`update-blog.ts:64`, `get-dashboard-stats.ts:61`, `get-analytics-overview.ts:136`, `sitemap.ts:51`, `app/[locale]/error.tsx:41`).
- [ ] Verify: `pnpm check-types && pnpm --filter web build`.
- [ ] Commit: `refactor: enforce ApiResponse contract across entity API layer`

### Task 5.4: Server-side zod validation on all mutating actions

**Files:** Create: `apps/web/src/shared/api/validate-action-input.ts`. Modify: the ~31 mutating actions listed in the audit (blog/project/education/company/tag/tech-stack CRUD ×3 each, `save-profile`, comment actions, media actions, analytics actions). Schemas already exist at `apps/web/src/entities/*/model/*-schema.ts`.

**Interfaces produced:** `export function parseInput<S extends z.ZodTypeAny>(schema: S, data: unknown): { ok: true; data: z.infer<S> } | { ok: false; errorMsg: string }`.

- [ ] Implement `parseInput` (safeParse; on failure flatten issues to a short human message). Spec in `apps/web/src/shared/lib/` is not needed — put a spec next to it only if jest testMatch covers `shared/api`; it does NOT (`src/shared/lib/**` only), so add the spec at `apps/web/src/shared/lib/validate-action-input.spec.ts` importing from `../api/validate-action-input` — actually simpler: place the helper in `apps/web/src/shared/lib/validate-action-input.ts` so the existing testMatch covers it. Use that path.
- [ ] In each mutating action, first `requireAdmin()`/`requireUser()` (already present), then `const parsed = parseInput(schema, data); if (!parsed.ok) return { success:false, errorMsg: parsed.errorMsg };` and use `parsed.data` from there on. For id params, validate with `z.string().min(1)` (match the schema id format).
- [ ] `create-blog.ts:22`: keep slug normalization but validate shape via `blogSchema` first.
- [ ] Verify: `pnpm check-types && pnpm --filter web test && pnpm --filter web build`.
- [ ] Commit: `fix(security): zod-validate every mutating server action`

---

## Phase 6: TanStack Query — key factory, defaults, invalidation (items 15, 29-part)

### Task 6.1: Query-key factories

**Files:** Create: `apps/web/src/entities/blog/model/blog-keys.ts` (and equivalents `project-keys.ts`, `tag-keys.ts`, `tech-stack-keys.ts`, `media-keys.ts`, `company-keys.ts`, `education-keys.ts`; comment already has `commentKey` — align naming, keep as-is). Modify: every inline queryKey site (audit found 20+: `blogs/page.tsx:36`, `blogs-content.tsx:41`, `projects-content.tsx:35`, `blog-form.tsx:50,55`, `project-dialog.tsx:49`, `blog-live-stats.tsx:19`, all managers via `use-crud-manager`, infinite-query hooks).

**Interfaces produced (pattern for every entity):**
```ts
export const blogKeys = {
  all: ['blog'] as const,
  publicList: (page: number, filters: { tagSlugs: string[]; search: string }) =>
    [...blogKeys.all, 'public-list', page, filters] as const,
  adminList: (page: number) => [...blogKeys.all, 'admin-list', page] as const,
  stats: (blogId: string) => [...blogKeys.all, 'stats', blogId] as const,
};
```

- [ ] Create factories per entity following the pattern; replace every inline literal. The server prefetch in `blogs/page.tsx` and the client `blogs-content.tsx` MUST both call `blogKeys.publicList(...)` — delete the "must match" comments.
- [ ] `use-crud-manager.ts`: change `queryKey: string` param to `queryKey: readonly unknown[]` (the factory's `adminList` output); fix internal `[queryKey, page]` construction and `invalidateQueries` to use the factory root so array keys invalidate correctly. Update all 7 manager call sites.
- [ ] Remove the stale doc comment at `blog-live-stats.tsx:12-14` (claims cache sharing with BlogCard that doesn't exist).
- [ ] Separate concern check: `CACHE_TAGS` stays ONLY for Next `revalidateTag`; TanStack keys come ONLY from factories.
- [ ] Verify: `pnpm check-types && pnpm --filter web build`; manually trace one flow: tech-stack save → invalidate → list refetch key matches.
- [ ] Commit: `refactor: centralize TanStack query keys in per-entity factories`

### Task 6.2: QueryClient defaults + mutation invalidation

**Files:** Modify: `apps/web/src/shared/lib/query/get-query-client.ts`, `apps/web/src/app/providers/tan-stack-query-provider.tsx`, `apps/web/src/features/public/toggle-blog-interactions/ui/like-button.tsx`, `clap-button.tsx`, `apps/web/src/widgets/public/blogs-content/ui/blogs-content.tsx:49`.

- [ ] Create one `makeQueryClient()` in `get-query-client.ts` with `defaultOptions: { queries: { staleTime: 60_000 } }`; both the server helper and the client provider construct through it. Remove the now-redundant local `staleTime` hardcode in `blogs-content.tsx:49` only if behavior is preserved (5-min staleTime there is intentional — keep it, it's now an explicit override).
- [ ] `like-button.tsx` / `clap-button.tsx`: add `onSettled: () => queryClient.invalidateQueries({ queryKey: blogKeys.stats(blogId) })` (and the interaction state key) so counts reconcile after mutation.
- [ ] Verify: `pnpm check-types && pnpm --filter web build`.
- [ ] Commit: `fix: shared QueryClient defaults + reconcile like/clap counts onSettled`

---

## Phase 7: Translation-read + query efficiency (items 25, 27, 31-tag-part done in P2)

### Task 7.1: Locale-filtered, field-selected translation reads

**Files:** Modify (~30 sites; worst first): `apps/web/src/entities/blog/api/get-paginated-public-blogs.ts:73`, `get-related-public-blogs.ts:38`, `get-adjacent-public-blogs.ts:32`, `get-paginated-admin-blogs.ts:27`, `apps/web/src/app/feed.xml/route.ts:23`, `apps/web/src/entities/comment/api/post-comment.ts:84`, then remaining `include: { translations: true }` sites (`grep -rn "translations: true" apps/web/src`). Reference for the good pattern: `get-analytics-overview.ts:102-104`. Helper: `apps/web/src/shared/lib/i18n-utils.ts` (`getTranslatedContent` falls back to `'en'`).

- [ ] Replace `translations: true` with `translations: { where: { language: { in: [locale, 'en'] } }, select: { language: true, <only fields the caller renders> } }`. For list endpoints that never render `content`, exclude it (`get-paginated-public-blogs`, `get-related-public-blogs` — delete its `content: ''` hack at `:57`, `get-adjacent-public-blogs` — select only `language, title`).
- [ ] `post-comment.ts:84`: select only `{ slug, translations: { select: { language, title } } }` for the email.
- [ ] Where locale isn't already in scope (admin endpoints), keep both locales but still `select` narrow fields.
- [ ] Verify: `pnpm check-types`; `pnpm --filter web build`; smoke: `getTranslatedContent` still resolves fallback (its behavior is unchanged — inputs are a superset-filtered array).
- [ ] Commit: `perf: locale-filter and field-select all translation reads`

### Task 7.2: Comment thread query scoping

**Files:** Modify: `apps/web/src/entities/comment/api/get-paginated-public-comments-for-blog.ts:39-57`

- [ ] Scope the descendants query to the fetched roots: `where: { blogId, parentId: { in: rootIds } }` (read the file first — if UI renders only one nesting level, this is complete; if arbitrarily deep, fetch level-2 the same way per page rather than the whole table).
- [ ] Replace `include: { user: true }` with `select` of the public fields already exposed by the payload-stripping code at `:83-111` (name/image only).
- [ ] Verify: `pnpm check-types`; commit: `perf: scope comment replies to current page roots; stop selecting full user rows`

### Task 7.3: Transaction hygiene in company/blog updates

**Files:** Modify: `apps/web/src/entities/company/api/update-company.ts:59-135`, `apps/web/src/entities/blog/api/update-blog.ts:43-64`

- [ ] `update-company.ts`: move `revalidateTag` (`:129`) OUT of the `$transaction` callback — call after it resolves. Convert the sequential `for … await role.create/update` loop into operations executed via `Promise.all` inside the transaction (order-independent) — keep delete-and-recreate semantics for now (id churn is acceptable; full upsert rewrite is out of scope).
- [ ] `update-blog.ts`: same pattern — parallelize independent nested writes, revalidate after commit, `console.error` → `logger.error` (done in 5.3 if already swept — verify).
- [ ] Verify: `pnpm check-types && pnpm --filter web build`. Commit: `perf: parallelize nested writes; revalidate only after commit`

---

## Phase 8: Caching, prefetch, rate limiting, email (items 16, 18, 28, 30)

### Task 8.1: DB-based rate limiter (no new deps)

**Files:** Create: `apps/web/src/shared/lib/rate-limit.ts` + `apps/web/src/shared/lib/rate-limit.spec.ts`. Modify: `apps/web/src/entities/contact-message/api/send-contact-message.ts`, `apps/web/src/entities/comment/api/post-comment.ts`, `apps/web/src/features/public/blog-analytics/lib/track-blog-view.ts`.

**Interfaces:** Consumes `RateLimitHit` model from Task 2.1. Produces:
```ts
export async function checkRateLimit(opts: { key: string; limit: number; windowSec: number }): Promise<{ allowed: boolean }>
```
Implementation: fixed window — `windowStart = new Date(Math.floor(Date.now() / (windowSec*1000)) * windowSec * 1000)`; atomic `upsert` on `@@id([key, windowStart])` with `count: { increment: 1 }`; allowed iff resulting `count <= limit`. Opportunistic cleanup: `deleteMany({ windowStart: { lt: <now - 2 windows> } })` fired-and-awaited on ~1% of calls (`count % 100 === 0` on the upserted row, no Math.random in shared code paths that tests cover — use the count check).

- [ ] Spec (mock prisma like `packages/db/__tests__/prisma.spec.ts` mocks): allows first N, blocks N+1 in same window, allows again in next window.
- [ ] Implement; `pnpm --filter web test`.
- [ ] Apply: contact form `key: contact:${ip}` limit 3/10min (ip from `headers()` `x-forwarded-for` first hop, fallback `'unknown'`); comments `key: comment:${userId}` limit 5/min; track-view `key: view:${ip}` limit 60/min. On block: contact/comment return `{ success:false, errorMsg: <existing i18n-friendly message> }`; track-view silently no-ops.
- [ ] Commit: `feat: DB-based fixed-window rate limiting on public write paths`

### Task 8.2: `after()` for notification emails

**Files:** Modify: `apps/web/src/entities/comment/api/post-comment.ts:38-43`, `apps/web/src/entities/contact-message/api/send-contact-message.ts:24`

- [ ] Wrap both email sends in `after(async () => { ... })` from `next/server` so serverless invocations aren't killed mid-SMTP; log failures with `logger.error`.
- [ ] Fix the email link while here: `post-comment.ts:105` — replace `process.env.NEXT_PUBLIC_APP_URL` with the `host` helper (`apps/web/src/shared/config/host.ts`) and fix path `/blog/` → `/en/blogs/` (default locale link). Also fix `packages/ui/src/lib/tiptap-utils.ts:44` `absoluteUrl` similarly — but packages/ui must not import app config: give `absoluteUrl` an explicit `base` parameter and pass it from app callers (check call sites first).
- [ ] Commit: `fix: defer notification emails with after(); correct email blog links`

### Task 8.3: Public list pages — server prefetch + cache

**Files:** Modify: `apps/web/src/app/[locale]/(public)/blogs/page.tsx` (drop `force-dynamic` at `:14`), `apps/web/src/app/[locale]/(public)/projects/page.tsx` (add prefetch), `apps/web/src/widgets/public/projects-content/ui/projects-content.tsx`, `apps/web/src/entities/blog/api/get-paginated-public-blogs.ts:132` and `apps/web/src/entities/project/api/get-paginated-public-projects.ts:157` (`cache: false` → `cache: true` with page/limit/filters mirrored into `cacheKey`, tag `CACHE_TAGS.BLOG`/`.PROJECT` so admin mutations purge).

- [ ] Blogs: page already prefetches — keep, remove `force-dynamic`, confirm draft-preview path still works (`includeDrafts` re-checks admin server-side; drafts flow goes through a different call — verify by reading `:20-44` comments).
- [ ] Projects: mirror the blogs prefetch pattern (`HydrationBoundary` + `queryClient.prefetchQuery` with `projectKeys.publicList(1, defaultFilters)` from Phase 6).
- [ ] Enable `unstable_cache` on both paginated public reads (keys now include all closure args per Task 5.2 discipline).
- [ ] Full client-page → RSC conversion of blogs/projects content (item 18) is intentionally deferred — prefetch + cache removes the practical cost; note this in the commit body.
- [ ] Verify: `pnpm --filter web build`; check `/blogs` route is no longer forced-dynamic in build output table. Commit: `perf: prefetch + cache public blog/project lists`

---

## Phase 9: Architecture — barrels, boundaries, dedup (items 11-14, 16-17, 22-24, 38-part)

### Task 9.1: `@byte-of-me/ui` subpath exports + codemod

**Files:** Modify: `packages/ui/package.json` (exports map), `apps/web/tsconfig.json:8` (delete the `@byte-of-me/ui` → `index.ts` alias), all 126 bare-barrel import sites (mechanical codemod), `packages/ui/src/index.ts` (keep for types/back-compat, per memory note `ui-barrel-import-cycle.md` — re-export only types + genuinely shared leaf components).

- [ ] Add to `exports`: `"./*": { "types": "./src/*.tsx", "default": "./src/*.tsx" }` plus explicit entries for dirs (`./hooks/*`, `./motion`, `./lib/*`) — verify against how the 6 existing subpath entries are declared and follow that exact style.
- [ ] Codemod client files first (77 files): `import { Button } from '@byte-of-me/ui'` → `import { Button } from '@byte-of-me/ui/button'`. Use a script over `grep -rln "from '@byte-of-me/ui'" apps/web/src` mapping each named import to its source module (module list from `packages/ui/src/index.ts`). Server-component imports may keep the barrel where convenient but prefer subpaths.
- [ ] Delete the tsconfig paths alias for the barrel; keep `transpilePackages`.
- [ ] Verify: `pnpm check-types && pnpm --filter web build` (this is the highest-regression-risk task — build must pass before commit). Commit: `refactor: subpath exports for @byte-of-me/ui; stop importing the mega-barrel from client code`

### Task 9.2: Kill in-app barrel cycles + deep-import hygiene

**Files:** Modify: `apps/web/src/features/public/toggle-blog-interactions/ui/{clap-button,like-button,clap-button-wrapper,like-button-wrapper}.tsx` (self-barrel imports → relative `../lib` / `../api` imports), `apps/web/src/app/[locale]/(public)/layout.tsx:7` and `(auth)/layout.tsx:5` (standardize on slice-level imports `@/widgets/public/public-site-footer`), `widgets/public/public-site-footer/ui/public-site-footer.tsx:3-6` (import features by slice), the 5 `@/entities`-barrel value imports (`media-library.tsx:6`, `education-dialog.tsx:26`, `education-achievement-item-field.tsx:26`, `project-dialog.tsx:22`, `profile-translation-card.tsx:15` → `@/entities/<slice>`).
Also: rename widget `PublicSiteFooter` → `PublicSiteFooterSection` (F1) and update its two consumers; delete no-op `app/[locale]/(auth)/auth/layout.tsx`; `app/page.tsx:4` `redirect('/en')` → `redirect(\`/${routing.defaultLocale}\`)`.

- [ ] Make all listed edits; then `grep -rn "from '@/features/public'" apps/web/src/features/public` must return nothing (no self-layer imports), and `grep -rn "from '@/entities'" apps/web/src` value-imports reduced to zero in client files.
- [ ] Verify: `pnpm check-types && pnpm --filter web build`. Commit: `refactor: break barrel cycles, slice-level imports, rename footer widget`

### Task 9.3: server-only guards + db types split

**Files:** Modify: `packages/db/package.json` + Create `packages/db/src/types.ts`; Modify `apps/web/src/shared/lib/auth/auth.ts`, `session.ts`, `apps/web/src/shared/api/*` (add `import 'server-only'`), `apps/web/src/proxy.ts`.

- [ ] `packages/db`: add export `"./types": "./src/types.ts"` where `types.ts` is `export type * from './generated/prisma/client'` (type-only, no side effects). Add `import 'server-only'`? — NO: packages/db is consumed by seed/tests outside Next; instead add `server-only` guards in the app layer only. Codemod the 12 `entities/*/model/types.ts` files to import from `@byte-of-me/db/types`.
- [ ] Add `import 'server-only';` as first line of `apps/web/src/shared/lib/auth/auth.ts`, `session.ts`, and each file in `apps/web/src/shared/api/` that touches prisma/storage secrets. `server-only` package: check it's already a transitive dep — Next.js ships it; if not resolvable, use the `import 'server-only'` from next's bundled package (verify with a quick build; if it fails, add nothing rather than a new dep — but Next 16 apps resolve it by default).
- [ ] `proxy.ts:13-25`: remove the `auth()` wrapper — export the intl middleware directly (`createMiddleware(routing)`), since the session was never read and real authz lives in `(protected)/layout.tsx` + per-action guards. Add a two-line comment stating where authz lives.
- [ ] Verify: `pnpm check-types && pnpm --filter web build`; confirm login + dashboard redirect still work by reading `(protected)/layout.tsx` logic (no middleware dependency). Commit: `refactor: server-only guards, type-only db entry, slim proxy middleware`

### Task 9.4: Entity-layer ownership of published-blog queries

**Files:** Create: `getPublishedBlogSlugs()` in `apps/web/src/entities/blog/api/get-published-blog-slugs.ts`. Modify: `apps/web/src/app/sitemap.ts:11`, `apps/web/src/app/feed.xml/route.ts:21`, `apps/web/src/app/[locale]/(public)/blogs/[slug]/page.tsx:12` (generateStaticParams).

- [ ] Implement `'use server'`-less plain server module returning `{ slug, updatedAt }[]` where `isPublished: true`; feed.xml keeps its richer query but moves it into `entities/blog/api/get-public-feed-blogs.ts` with narrow selects (aligns with Task 7.1).
- [ ] Verify + Commit: `refactor: move published-blog queries into entities/blog`

### Task 9.5: Dedup — infinite-query factory, useResetOnOpen, component splits, misc

**Files:** Create: `apps/web/src/shared/hooks/use-infinite-list-query.ts`, `apps/web/src/shared/hooks/use-reset-on-open.ts`. Modify: the 4 infinite hooks (`entities/{tag,tech-stack,media}/api/use-*-infinite-query.ts`, `entities/comment/api/use-comment-infinite-query.ts`), the 5 dialogs with reset effects (`project-dialog.tsx:93`, `company-dialog.tsx:84`, `tech-stack-dialog.tsx:49`, `tag-dialog.tsx:43`; translation-dialog is deleted in Phase 3), split `project-dialog.tsx` (352) and `blog-form.tsx` (340) by extracting the remote-options loader pair into `use-reference-options.ts` hooks per widget, `packages/ui/src/expandable-text.tsx` (accept `showMoreLabel`/`showLessLabel` props; update app call sites to pass translated strings; drop `next-intl` from `packages/ui` deps if no other usage — `grep -rn "next-intl" packages/ui/src`), delete the three `*-section-motion.tsx` wrappers in favor of `RevealSection` (`grep -rn "section-motion" apps/web/src` for call sites), delete 4 empty barrel files, fix `catch (error: any)` in `send-contact-message.ts:28,59` (→ `catch (error: unknown)` + narrowing) and `use-clipboard.ts:12,45` (`value: string`), `Record<string, any>` → `Record<string, unknown>` in `packages/logger/src/index.ts`, remove the 2 `@ts-ignore` in `packages/ui/src/rich-text-editor/tiptap/extensions/search-and-replace.tsx:226,254` by typing the ProseMirror APIs correctly (read surrounding code; if the underlying tiptap types genuinely lack the member, use a locally-declared interface extension, not `@ts-ignore`).
Also: `entities/{media,comment,tag,tech-stack}/api/` — split client hooks out of the server-action barrel into `entities/<slice>/query/` with its own `index.ts`; update importers.

- [ ] Factory interface:
```ts
export function useInfiniteListQuery<T>(opts: {
  queryKey: readonly unknown[];
  fetchPage: (page: number) => Promise<ApiResponse<Paginated<T>>>;
  limit?: number;
}) // wraps useInfiniteQuery with the shared unwrap + getNextPageParam
```
- [ ] `useResetOnOpen(form, open, initialData, toDefaults)` — resets to `toDefaults(initialData)` when `open` becomes true; resets to empty defaults when `initialData` is null; single guard strategy everywhere; remove per-call-site `key={...}` remount hacks only where the hook fully covers them (verify each).
- [ ] Move manager skeleton + refetch-spinner defaults into `shared/ui/manager-list-state.tsx` (default skeleton when prop omitted; spinner position standardized); delete per-manager copies.
- [ ] Add dashboard segment error boundary: `apps/web/src/app/[locale]/(protected)/dashboard/error.tsx` (client component, `logger`-free — console is fine client-side? No: match `app/[locale]/error.tsx` style but route through a client-safe log; keep simple: render retry UI, `console.error` is acceptable in client error boundaries — mirror existing file).
- [ ] Verify after each sub-group: `pnpm check-types && pnpm lint`; final `pnpm --filter web build && pnpm test`.
- [ ] Commits (split): `refactor: shared infinite-query + dialog-reset hooks`, `refactor: split oversized dialogs; manager list-state defaults`, `chore: type-safety cleanup (@ts-ignore, any, empty barrels)`, `refactor: split client query hooks out of server-action barrels`

### Task 9.6: NextIntl client payload scoping

**Files:** Modify: `apps/web/src/app/[locale]/layout.tsx:145,156`, `(public)/layout.tsx`, `(protected)/layout.tsx`

- [ ] Move `NextIntlClientProvider` from the locale root into each route-group layout, passing `messages={pick(await getMessages(), NAMESPACES)}` — next-intl supports passing a subset; public group gets its namespaces (inspect `messages/en.json` top-level keys and grep `useTranslations('` under features/widgets public vs dashboard to build each list), protected gets dashboard+shared. Keep a minimal root provider ONLY if root-level client components use translations (grep first).
- [ ] Verify: `pnpm --filter web build`; spot-check no missing-message runtime errors by scanning `useTranslations(` namespaces against the lists. Commit: `perf: scope next-intl client messages per route group`

---

## Phase 10: Tooling/DX (items 33-38 minus CI)

### Task 10.1: Test gates + package scripts

**Files:** Modify: `.husky/pre-push`, `packages/{db,logger,storage}/package.json`, `packages/config/package.json`, `packages/storage/package.json` (lint), `turbo.json`

- [ ] `.husky/pre-push`: `turbo run build` → `turbo run test build`.
- [ ] Add `"check-types": "tsc --noEmit"` to db/logger/storage/config; add `"lint": "eslint src"` + `"lint:fix": "eslint src --fix"` to db/logger/config; fix storage `"lint": "eslint src --fix"` → check-only + separate `lint:fix`.
- [ ] `turbo.json`: add `NEXT_PUBLIC_ENV`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_AUTHOR_EMAIL` to `build.env`; add the four `db:*` scripts to `packages/db/package.json` (`db:migrate:dev`, `db:migrate:deploy`, `db:push`, `db:seed` → prisma commands per `prisma.config.ts`), so declared turbo tasks resolve; README command snippets updated to `pnpm db:*` forms.
- [ ] Verify: `pnpm check-types && pnpm lint` now cover all packages (watch for a wave of new errors in db/logger/storage — fix them; they've never been linted). Commit: `chore: typecheck+lint all packages, test in pre-push, turbo env/db tasks`

### Task 10.2: ESLint flat-config consolidation

**Files:** Delete: `apps/web/.eslintrc.json`. Modify: `eslint.config.mjs` (root)

- [ ] Port `next/core-web-vitals` into the flat config using the installed `@next/eslint-plugin-next` (flat preset `nextPlugin.flatConfig.coreWebVitals` — check the plugin version's export shape first) scoped to `apps/web/**`. Delete the legacy `.eslintrc.json`.
- [ ] Run `pnpm lint`; fix newly surfaced Next-rule violations (expect a handful — image alt, sync scripts). Commit: `chore: enforce next/core-web-vitals via flat config; drop dead eslintrc`

### Task 10.3: Dependency hygiene

**Files:** Modify: `apps/web/package.json`, `pnpm-workspace.yaml` (catalog), `packages/ui/package.json`, root `package.json` (engines)

- [ ] Remove from apps/web: `draft-js-import-markdown`, `mdast-util-toc`, `@types/mdast`, `@tailwindcss/line-clamp`, `eslint-plugin-next`, `eslint-config-next`, `pretty-quick`, `prettier-plugin-tailwindcss`, `ts-node`, `@commitlint/*`, and the stale `"prisma": { "seed": ... }` block. Re-grep each name across the repo before removal to confirm zero usage.
- [ ] `@types/node`: `^18` → match workspace (`^25.5.0`). Add `"engines": { "node": ">=24" }` to root (matches `.nvmrc` v24.4.1); update README "Node ≥ 20" → "Node ≥ 24".
- [ ] `pnpm-workspace.yaml`: add `catalog:` with the 60 shared deps (all `@radix-ui/*`, all `@tiptap/*`, `framer-motion`, `date-fns`, `lucide-react`, `cmdk`, `vaul`, `embla-carousel-react`, `react-day-picker`, `sonner`, `clsx`, `tailwind-merge`, `class-variance-authority`); switch both consumers to `"catalog:"`. Align drifted versions (`typescript` → one version, `eslint-*` root versions win). Run `pnpm install`; `pnpm build`.
- [ ] Unify prettier: make `apps/web/prettier.config.js` the single config moved to root (it carries the import-sort plugin), delete `.prettierrc.json`, add root `"format"` script covering `apps` + `packages`. Do NOT reformat the whole repo in this commit — config only (formatting churn would pollute the diff).
- [ ] Commit: `chore: prune dead deps, catalog shared versions, node 24 engines, single prettier config`

### Task 10.4: Config/env correctness

**Files:** Modify: `apps/web/next.config.js:10`, `apps/web/src/shared/config/env.ts`, `packages/db/prisma/seed.ts`, `README.md`, Create: `packages/storage/.env.example`

- [ ] `next.config.js:10`: derive image hostname from env: `new URL(process.env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT ?? '').hostname` with a safe fallback pattern (config runs at build; the env var is required in `env.ts` server schema — read how next.config currently accesses env for the pattern).
- [ ] Seed idempotency: `prisma.user.create` → `upsert` keyed on email (and the other 4 `create(` calls → upsert where a unique key exists); print `AUTHOR_ID=<user.id>` at the end; README step 5: document that `apps/web/.env` `AUTHOR_ID` must be set to the seeded user id (or seed with fixed UUID `00000000-0000-0000-0000-000000000001` and document it — choose fixed UUID, simpler).
- [ ] `packages/storage/.env.example` listing the 7 `SUPABASE_S3_*` keys; README setup section mentions it. Verify whether `packages/storage/.env` is actually loaded (`grep -rn "dotenv" packages/storage`) — if not, note in its README that env comes from the consuming app, and delete the stray `.env` mention from setup if wrong.
- [ ] Commit: `chore: env-derived image host, idempotent seed with fixed author id, storage env docs`

### Task 10.5: Final verification sweep

- [ ] `pnpm check` (types → lint → test → build, per scripts/check.sh).
- [ ] Grep-based regression checks: no `console.error` in server API layer; no `: any`/`@ts-ignore` outside documented exceptions; no `translations: true` remaining; no inline TanStack keys (`grep -rn "queryKey: \['" apps/web/src` returns only factory files); no bare `@byte-of-me/ui` imports in client components.
- [ ] Update `docs/architecture.md` sections invalidated by this work (translation-override removal, query-key factories, rate limiting) — surgical edits only.
- [ ] Final commit + summary for user with the full change list.

---

## Self-Review Notes

- Items intentionally deferred/adjusted: item 18 full RSC conversion of blogs/projects content (mitigated by prefetch+cache in 8.3); item 14's `api/`→`query/` split limited to the 4 slices that mix directives (9.5); PageView resolved by deletion (dead feature) rather than implementation.
- Type consistency: `ApiResponse` (5.3) precedes factory/hook work (6.x, 9.5) which consume it. `RateLimitHit` (2.1) precedes `checkRateLimit` (8.1). `blogKeys` (6.1) precedes prefetch rework (8.3) and manager migration already uses plain strings in 4.2 then upgraded in 6.1 — acceptable two-step.
- Every task carries its own verify + commit; schema work batched into exactly two migrations.
