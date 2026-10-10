# Web shared slice

> Cross-cutting code every layer may import, plus the test preloads that wrap it. Source: `apps/web/src/shared/**`, `apps/web/messages/`, `apps/web/test-setup.ts`, `apps/web/next-runtime-stubs.ts`, `apps/web/server-only-stub.ts`, `apps/web/happydom.ts`, `apps/web/bunfig.toml`.

## Layout

```text
apps/web/src/shared/
├── api/      index.ts barrel: mailer.ts (`mailer`), s3-storage-api.ts (`supabaseStorage`),
│             public-action-template.ts (`withPublicActionHandler`, `handlePublicAction`)
├── config/   env.ts (validated env, keys in ../environment.md), site.ts, global.ts (nav, `Routes`),
│             host.ts (base URL), language.ts (`supportedLanguages`), sitemap.ts
├── hooks/    client hooks: use-crud-manager, use-editing-record, use-infinite-list-query,
│             use-url-synced-search, use-form-autosave, use-reset-on-open,
│             use-reveal-on-invalid-submit, use-print-on-fonts-ready
├── i18n/     routing.ts (locales), request.ts (next-intl request config),
│             navigation.ts (Link, useRouter, ...), messages.ts (client namespace lists, `pickMessages`)
├── lib/      server and pure helpers (tables below); auth/, query/, media/, templates/
├── types/    api/ (ApiResponse, PaginatedData), models/ (hand-written Media, Project, Tag, TechStack),
│             index.d.ts (LocaleType, SiteConfig, global Nullable/Maybe), next-auth.d.ts (session.user)
└── ui/       app components; index.ts barrel exports 11 of 22 modules, the rest are imported by path
apps/web/messages/   en.json, vi.json: UI strings, same 14 top-level namespaces; *.d.json.ts generated and tracked
```

### lib/ catalogue

| file | purpose | main consumers (non-spec, rg) |
| --- | --- | --- |
| `apps/web/src/shared/lib/constants.ts` | `CACHE_TAGS` (14 tags), `LAYOUT_CACHE_REVALIDATE_SECONDS` (3600), `PATHNAME_HEADER` (`x-pathname`), `INTERACTION` | 61 files: `apps/web/src/entities/blog/`, `apps/web/src/features/public/`, `apps/web/src/entities/featured-work/` |
| `apps/web/src/shared/lib/utils.ts` | `cn` (re-export), `getErrorMessage`, `ensureValidUrl`, date and size formatters | 117 files: `apps/web/src/widgets/public/`, `apps/web/src/shared/ui/`, `apps/web/src/widgets/dashboard/` |
| `apps/web/src/shared/lib/validate-action-input.ts` | `parseInput`, `idSchema`, `INVALID_INPUT_MESSAGE` | 42 files: `apps/web/src/entities/blog/`, `apps/web/src/entities/featured-work/`, `apps/web/src/entities/project/` |
| `apps/web/src/shared/lib/pagination.ts` | `clampPagination` (defaults: 12 rows, max 50), `buildPaginatedMeta`, `MAX_PAGE` | 15 files: `apps/web/src/entities/tag/`, `apps/web/src/entities/project/`, `apps/web/src/entities/comment/` |
| `apps/web/src/shared/lib/public-input-schema.ts` | zod for anonymous ids, slugs, search text | 5 files: `apps/web/src/entities/blog/`, `apps/web/src/features/public/`, `apps/web/src/entities/project/` |
| `apps/web/src/shared/lib/filter-params.ts` | URL filter parsing; `searchHistoryMode` (push vs replace) | 7 files: `apps/web/src/features/public/`, `apps/web/src/shared/hooks/` |
| `apps/web/src/shared/lib/i18n-utils.ts` | DB translations: `getTranslationLanguages`, `getTranslatedContent` | 23 files: `apps/web/src/entities/blog/`, `apps/web/src/entities/project/`, `apps/web/src/entities/user-profile/` |
| `apps/web/src/shared/lib/rate-limit.ts` | `checkRateLimit` (fixed window, fails open) | 6 files: `apps/web/src/features/public/`, `apps/web/src/entities/comment/`, `apps/web/src/entities/contact-message/`, `apps/web/src/shared/lib/auth/` |
| `apps/web/src/shared/lib/client-ip.ts` | `getClientIp(headers)`: Vercel header, `x-real-ip`, `x-forwarded-for`, else `'unknown'` | 3 files: `apps/web/src/entities/contact-message/`, `apps/web/src/features/public/`, `apps/web/src/shared/lib/auth/` |
| `apps/web/src/shared/lib/query/` | `getQueryClient`, `makeQueryClient`, `prefetchAdminPage`, `unwrapApiResponse`, `ADMIN_PAGE_SIZE` (12), `ADMIN_OPTIONS_LIMIT` (500) | 23 files: `apps/web/src/app/[locale]/`, `apps/web/src/widgets/dashboard/`, `apps/web/src/shared/hooks/` |
| `apps/web/src/shared/lib/media/` | image compression: shared `image-compression-rules.ts` and `-config.ts`; `compress-in-browser.ts` (client), `compress-image.ts` (server, sharp) | 10 files: `apps/web/src/entities/media/`, `apps/web/src/features/dashboard/`, `apps/web/src/entities/workspace-settings/` |
| `apps/web/src/shared/lib/metadata.ts` | `buildPublicPageMetadata`, `buildAlternates` (canonical, hreflang with `x-default`, RSS link), `buildSiteJsonLd` (no email), `SITE_PERSON_ID` (the `@id` blog posts reference as author), `buildIconSet` | the layouts under `apps/web/src/app/[locale]/` and the blog post page |
| `apps/web/src/shared/lib/brand-mark.ts` | mark geometry, `renderFaviconSvg`; source for favicons and the og card | 3 files: `apps/web/src/shared/ui/brand-mark.tsx`, `apps/web/src/shared/lib/metadata.ts`, `apps/web/src/app/api/og/route.tsx` |
| `apps/web/src/shared/lib/friendly-id.ts` | `generateFriendlyId`: 12 chars, no 0/1/i/l/o | 1 file: `apps/web/src/entities/media/` |
| `apps/web/src/shared/lib/templates/sign-in-template.ts` | sign-in email HTML (`email` namespace) | 1 file: `apps/web/src/shared/lib/auth/auth.ts` |

### Auth helpers (`apps/web/src/shared/lib/auth/`)

| file | does | consumers |
| --- | --- | --- |
| `session.ts` | `getAuthenticatedUser`, `requireUser` (role USER or ADMIN); `getAuthenticatedAdmin`, `requireAdmin` (role ADMIN **and** owner identity) | barrel: 67 files; `apps/web/src/app/[locale]/(protected)/layout.tsx`, `apps/web/src/app/[locale]/(auth)/layout.tsx` |
| `auth.ts` | Auth.js (next-auth 5 beta): JWT sessions, Prisma adapter, email, GitHub, Google and `-admin` twins; callbacks `signIn` (:94), `jwt` (:111), `session` (:135); exports `handlers`, `auth`, `signIn`, `signOut` | `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `session.ts`, `apps/web/src/features/auth/lib/` |
| `sign-in-policy.ts` | pure `evaluateSignIn`: email sign-in owner-only; Google and GitHub need a verified email; `-admin` ids owner-only | `auth.ts` |
| `site-owner.ts` | `isSiteOwnerEmail`: the one owner-identity check (case-insensitive) | `session.ts`, `auth.ts`, `sign-in-policy.ts`, `apps/web/src/features/auth/lib/log-in-to-dashboard.ts` |
| `callback-url.ts` | `sanitizeCallbackUrl(from, locale)`: open-redirect and locale guard; falls back to `/{locale}/dashboard` | `apps/web/src/features/auth/lib/` (log-in-to-dashboard, log-in-to-dashboard-with-oauth, log-in-with-github, log-in-with-google) |
| `admin-oauth-providers.ts` | `ADMIN_OAUTH_PROVIDER_IDS` (`github-admin`, `google-admin`), `isAdminOAuthProviderId` | `auth.ts`, `sign-in-policy.ts` |
| `github-userinfo.ts` | `fetchGitHubProfile`: adds `email_verified` from the GitHub emails endpoint | `auth.ts` |
| `magic-link-rate-limit.ts` | `isMagicLinkRequestAllowed`: 5 mails per 600 s per IP, fails open | `auth.ts` (:103) |
| `normalize-email.ts` | `normalizeEmail`: trim and lowercase | `site-owner.ts`, `github-userinfo.ts` |
| `set-test-user.test-helper.ts` | `setTestUser`, `resetTestUser` (specs only) | 8 spec files |
| `index.ts` | barrel: `admin-oauth-providers`, `auth`, `callback-url`, `normalize-email`, `session`; `site-owner` arrives via `session` | n/a |

### i18n: two systems (AGENTS §4)

| system | holds | files |
| --- | --- | --- |
| next-intl | fixed UI text in `en` and `vi` (14 namespaces) | `apps/web/messages/en.json`, `apps/web/messages/vi.json`; `apps/web/src/shared/i18n/request.ts` (wired at `apps/web/next.config.js:304`); `apps/web/src/shared/i18n/routing.ts` (locales, default `en`); `apps/web/src/shared/i18n/navigation.ts` (28 importers) |
| DB `*Translation` tables | authored content: titles, bodies, tag names | `apps/web/src/shared/lib/i18n-utils.ts`: `getTranslationLanguages(locale)` in the query, `getTranslatedContent(rows, locale)` picks locale, then `en`, then the first row |

- Client message lists per route group: `apps/web/src/shared/i18n/messages.ts` (`ROOT_MESSAGE_NAMESPACES`, `PUBLIC_MESSAGE_NAMESPACES`, `AUTH_MESSAGE_NAMESPACES`, `DASHBOARD_MESSAGE_NAMESPACES`, `PUBLIC_PRINT_MESSAGE_NAMESPACES`, `pickMessages`), used by the layouts under `apps/web/src/app/[locale]/`.
- Nested providers replace `messages` instead of merging, so each list must be complete on its own.

### Rate limit and revalidate

- `checkRateLimit({ key, limit, windowSec })` returns `{ allowed }`; one atomic upsert on `RateLimitHit` (table `rate_limit_hits`, `packages/db/prisma/schema.prisma:811`).
- Keys in use: `comment:<userId>` 5/60 s, `contact:<ip>` 3/600 s, `interaction:<userId>` 20/60 s, `view:<ip>` 60/60 s, `reading-time:<logId>` 10/60 s, `magic-link:<ip>` 5/600 s.
- No shared revalidate helper. Mutating actions call `revalidateTag(CACHE_TAGS.X, 'max' | 'default')` from `next/cache` after the write (AGENTS §8): 34 call sites in `apps/web/src`.
- `purgeEntireCache()` (admin-gated, `revalidatePath('/', 'layout')`) lives in `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/purge-entire-cache.ts`.
- Under `bun test`, `revalidateTag` and `revalidatePath` are no-ops (`stub-next-cache`).

### Test wiring (`apps/web/bunfig.toml` `preload`, in order)

| preload | effect |
| --- | --- |
| `apps/web/server-only-stub.ts` | `server-only` becomes an empty module; must load before `env.ts` |
| `apps/web/next-runtime-stubs.ts` | `Bun.plugin` stubs: `next-intl/server`, `next/cache` (no-op revalidate), `@/shared/lib/auth/auth` (fake `auth()`), `@/shared/lib/auth` (identity: default ADMIN owner, id `admin-1`), `@/shared/i18n/navigation` (records pushes) |
| `apps/web/test-setup.ts` | DB guard (below) |
| `apps/web/happydom.ts` | happy-dom `Window` on `globalThis` for `*.spec.tsx` |
| `apps/web/src/shared/ui/lazy-rich-text-editor.test-stub.ts` | replaces the TipTap editor for every spec |

- DB guard: `test-setup.ts` sets the two database URL env vars to a local, unreachable placeholder unconditionally, then throws if either is non-local. Bun loads `apps/web/.env` before preloads, so a `??=` default would keep production (AGENTS §10).
- Identity: specs run as the stub admin. Switch with `setTestUser`, restore with `resetTestUser` in `afterAll` (8 spec files do).
- Specs are `*.spec.ts(x)`, rendered with `@testing-library/react`; `mock.module()` is banned (AGENTS §10).
- Preloads are process-wide: a stub added to `bunfig.toml` affects every spec.

## Key flows

- Admin view vs action: `apps/web/src/app/[locale]/(protected)/layout.tsx` checks `getAuthenticatedAdmin()` for the view; each admin action calls `requireAdmin()` itself (AGENTS §5).
- Sign-in: `apps/web/src/shared/lib/auth/auth.ts` `signIn` runs `evaluateSignIn`, then the magic-link limit; sign-in mail is sent only from `sendVerificationRequest`, which re-checks `isSiteOwnerEmail` (`auth.ts:155`).
- Redirect target: every sign-in entry point passes `from` through `sanitizeCallbackUrl(from, locale)` (`apps/web/src/shared/lib/auth/callback-url.ts:40`).
- Public read: `handlePublicAction` (`apps/web/src/shared/api/public-action-template.ts:91`) catches, logs, and returns a generic `errorMsg` with `errorCode: 'unknown'`; it wraps `withPublicActionHandler` (`:34`), which adds the locale and optional `unstable_cache`.
- Public write: `parseInput` (`apps/web/src/shared/lib/validate-action-input.ts:49`), then `checkRateLimit` (`apps/web/src/shared/lib/rate-limit.ts:23`), then Prisma, then `revalidateTag` after the write.
- Admin list: `prefetchAdminPage(pageKey, fetchPage)` on the server and `useCrudManager` on the client share the key factory and the fetcher, and both use `ADMIN_PAGE_SIZE`.
- Image upload: `compressInBrowser` (canvas) and `compressImage` (sharp, `server-only`) both apply `image-compression-rules.ts`, so they agree on skip and size rules.

## Recipes

1. **Add a UI string.**
   1. Add the key at the same path in `apps/web/messages/en.json` and `apps/web/messages/vi.json`; `apps/web/src/shared/lib/i18n-parity.spec.ts` fails on a one-sided key.
   2. For a client component in a route group, add its namespace to that group's list in `apps/web/src/shared/i18n/messages.ts`.
   3. Run `cd apps/web && bun run build`, then `bun run check-types` (AGENTS §10 order).
2. **Rate-limit a public write.**
   1. Copy the call at `apps/web/src/entities/comment/api/post-comment.ts:49-53` (user key) or `apps/web/src/entities/contact-message/api/send-contact-message.ts:37-41` (IP key from `getClientIp(headerList)`).
   2. Use a key prefix not listed above; return the failure envelope when `allowed` is false.
3. **Add a cached public read.**
   1. Copy `apps/web/src/entities/blog/api/get-public-blog-by-slug.ts:21-22` and `:89-91`: `handlePublicAction` around `withPublicActionHandler` with `cache: true`, `cacheKey`, `cacheTags`.
   2. In the mutating action, call `revalidateTag(CACHE_TAGS.X, 'max')` after the write, as in `apps/web/src/entities/project/api/update-project.ts:92`.

## Gotchas

- `parseInput` returns `ok`, not `success`: `{ ok: false, errorMsg, errorCode: 'invalid', detail }`; `detail` is for logs only.
- `checkRateLimit` and `isMagicLinkRequestAllowed` report "allowed" on any database error. This is deliberate fail-open.
- Owner identity is the owner override, else the contact address; that address defaults to a literal at `apps/web/src/shared/config/env.ts:11`, so set the override in production (see ../environment.md).
- `purgeEntireCache` is not in `apps/web/src/shared/lib/revalidate.ts`, the path AGENTS §6 gives; that file does not exist. The helper is under `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/`.
- `revalidateTag`'s second argument is `'max'` in 31 calls and `'default'` in 3: copy the neighbouring action rather than choosing.
- `withPublicActionHandler` appends only `locale` to `unstable_cache` keys; every other input the handler closes over must be in `cacheKey` (AGENTS §8).
- Per-record tags are raw strings: `cacheTags: [CACHE_TAGS.BLOG, slug]` (`apps/web/src/entities/blog/api/get-public-blog-by-slug.ts:91`) is cleared by `revalidateTag(blog.slug, 'max')` (`apps/web/src/features/public/toggle-blog-interactions/lib/toggle-blog-interaction.ts:80`); change one, change both.
- `ADMIN_PAGE_SIZE` is not part of the admin query key (`apps/web/src/shared/lib/query/admin-list.ts`); a prefetch and a manager that disagree hydrate the wrong rows.

## Run

```bash
cd apps/web && bun test                                    # "test" script; cwd must be apps/web
bun run --filter 'web' test                                # same suite, from the repo root
cd apps/web && bun test src/shared/lib/rate-limit.spec.ts  # one spec file
cd apps/web && bun run check-types                         # tsc --noEmit
cd apps/web && bun run build                               # next build; regenerates apps/web/messages/*.d.json.ts
```

## AGENTS.md deviations

- `apps/web/src/shared/i18n/request.ts:20`: `console.error` in server request config; §8 requires `logger` from `@byte-of-me/logger`.
- `apps/web/src/shared/config/language.ts:3` and `apps/web/src/shared/types/index.d.ts:7` re-declare the locale set that §4 says is declared once, in `apps/web/src/shared/i18n/routing.ts:5` (§4, §11.3).
- `apps/web/src/shared/config/env.ts:11,48,55,69` and `apps/web/src/shared/config/site.ts:18`: literal fallback values for environment settings (§11.7).
- `apps/web/next-runtime-stubs.ts:2`: header says "three specifiers"; the file registers five module stubs (§11.11).
- Comment blocks far longer than three lines (§11.14): `apps/web/next-runtime-stubs.ts:1-91`, `apps/web/bunfig.toml:2-28`, `apps/web/src/shared/lib/auth/site-owner.ts:6-36`.

## See also

- [web-app-routes.md](web-app-routes.md): the layouts that mount the message lists and auth guards.
- [web-entities-content.md](web-entities-content.md), [web-entities-supporting.md](web-entities-supporting.md): actions built on these helpers.
- [web-features.md](web-features.md): `apps/web/src/features/auth/` and public blog interactions.
- [web-widgets.md](web-widgets.md): dashboard managers on the CRUD and list hooks.
- [packages-ui.md](packages-ui.md): `cn`, motion and editor subpath exports.
- [packages-db.md](packages-db.md): `RateLimitHit` and the Prisma client.
- [tooling-and-small-packages.md](tooling-and-small-packages.md): `@byte-of-me/logger`, `@byte-of-me/storage`.
- [../architecture.md](../architecture.md), [../environment.md](../environment.md).
