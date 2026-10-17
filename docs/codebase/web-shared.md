# Web shared slice

> Cross-cutting code every layer may import, plus the test preloads that wrap it. Source: `apps/web/src/shared/**`, `apps/web/messages/`, `apps/web/next-runtime-stubs.ts`, `apps/web/server-only-stub.ts`, `apps/web/bunfig.toml`, `packages/config/test/`.

## Layout

```text
apps/web/src/shared/
├── api/      index.ts barrel: mailer.ts (`mailer`), s3-storage-api.ts (`supabaseStorage`),
│             public-action-template.ts (`withPublicActionHandler`, `handlePublicAction`)
├── config/   env.ts (validated env, keys in ../environment.md), site.ts, global.ts (nav, `Routes`),
│             host.ts (base URL), language.ts (`languageNames`: the `global.i18nToggle` key naming each locale), sitemap.ts
├── hooks/    client hooks that read next-intl: use-crud-manager, use-editor-labels
│             (the framework-light ones are `@byte-of-me/query`, `ui-forms` and `ui-hooks`)
├── i18n/     routing.ts (locales), request.ts (next-intl request config),
│             navigation.ts (Link, useRouter, ...), messages.ts (client namespace lists, `pickMessages`)
├── lib/      server and pure helpers (tables below); auth/, media/, templates/
├── types/    models/ (hand-written Media, Project, Tag, TechStack),
│             index.d.ts (LocaleType, SiteConfig, global Nullable/Maybe), next-auth.d.ts (session.user)
└── ui/       app components; index.ts barrel re-exports 18 entries (form/ included), the rest are imported by path
apps/web/messages/   en.json, vi.json: UI strings, same 14 top-level namespaces; *.d.json.ts generated and tracked
```

### lib/ catalogue

| file | purpose | main consumers (non-spec, rg) |
| --- | --- | --- |
| `packages/api-core` (`@byte-of-me/api-core`, root) | the pure core of the server-action API, client-safe: `ApiResponse`, `PaginatedData`, `clampPagination`, `buildPaginatedMeta`, `MAX_CACHED_PAGE`, `unwrapApiResponse`, `ServerActionError`, `CACHE_TAGS` (14 tags), `INTERACTION`, `cuidSchema` and the other anonymous-input schemas, `safeHttpUrl`, `isSafeHttpUrl`, `toSafeHref`, `getTranslationLanguages`, `getTranslatedContent`, `parsePageParam`, `parseSlugListParam`, `searchHistoryMode`, `normalizeEmail`; every export is listed in [tooling-and-small-packages.md](tooling-and-small-packages.md) | 142 files (non-spec, rg): `apps/web/src/entities/` (every slice), `apps/web/src/features/`, `apps/web/src/shared/hooks/`, `apps/web/src/shared/api/` |
| `@byte-of-me/api-core/server` | `parseInput`, `idSchema`, `getClientIp`; imports `logger` and `node:net`, so server code only | 50 files: every `'use server'` action in `apps/web/src/entities/*/api/`, `apps/web/src/features/public/blog-analytics/lib/blog-view-log.ts`, `apps/web/src/shared/lib/auth/magic-link-rate-limit.ts` |
| `packages/contracts` (`@byte-of-me/contracts`, root and one subpath per entity) | the entities' zod form and params schemas, TanStack query-key factories, upload constraints, `TAG_MUTATION_TAGS` / `TECH_MUTATION_TAGS`, `richTextDocSchema` and the image-compression config and rules; client-safe, no database import; every export is listed in [tooling-and-small-packages.md](tooling-and-small-packages.md) | 108 non-spec files (rg): `apps/web/src/entities/` (every slice with a schema or key), `apps/web/src/features/dashboard/`, `apps/web/src/widgets/dashboard/`, `apps/web/src/shared/lib/media/` |
| `apps/web/src/shared/lib/constants.ts` | `LAYOUT_CACHE_REVALIDATE_SECONDS` (3600), `PATHNAME_HEADER` (`x-pathname`) | 3 files: `apps/web/src/proxy.ts`, `apps/web/src/app/[locale]/(protected)/layout.tsx`, `apps/web/src/entities/workspace-settings/api/get-workspace-settings.ts` |
| `apps/web/src/shared/lib/utils.ts` | `cn` (re-export from `@byte-of-me/ui-utils`, never the `ui` barrel: `/api/og` fails its build with it), `getErrorMessage`, `ensureValidUrl` (http(s), `mailto:`, `tel:` pass; a bare host gets `https://`; any other scheme returns `#`), date and size formatters | 117 files: `apps/web/src/widgets/public/`, `apps/web/src/shared/ui/`, `apps/web/src/widgets/dashboard/` |
| `apps/web/src/shared/lib/public-media.ts` | `PUBLIC_MEDIA_SELECT`: the Prisma `select` for a Media relation in a public payload (`PublicMedia` in `shared/types/models/media.ts`: id, url, mimeType, width, height) | 8 files: `apps/web/src/entities/blog/`, `apps/web/src/entities/project/`, `apps/web/src/entities/tech-stack/`, `apps/web/src/entities/education/` |
| `apps/web/src/shared/lib/rate-limit.ts` | `checkRateLimit` (fixed window, fails open) | 6 files: `apps/web/src/features/public/`, `apps/web/src/entities/comment/`, `apps/web/src/entities/contact-message/`, `apps/web/src/shared/lib/auth/` |
| `packages/query` (`@byte-of-me/query`, root) | the client-state hooks, `QueryState` and the query client: `useServerMutation` (the one client write path: unwraps the envelope, invalidates the `invalidate` keys and runs `onSuccess` only on success, then toasts `successMessage` with `toast.success`; on failure logs `errorMsg` with `console.error` and toasts `errorMessages[errorCode]`, else `errorMessage`), `useInfiniteListQuery`, `HYDRATED_LIST_BEHAVIOR`, `useEditingRecord`, `useUrlSyncedSearch`, `QueryState` (skeleton while loading, error block with a retry button, empty block, then content; a background refetch keeps the content and shows a corner spinner; a `pagination` slot is drawn under the content and in the empty state; every string comes from the caller), `getQueryClient`, `makeQueryClient`, `ADMIN_PAGE_SIZE` (12), `ADMIN_OPTIONS_LIMIT` (500); every export is listed in [tooling-and-small-packages.md](tooling-and-small-packages.md) | 63 non-spec files (rg): the write hooks in `apps/web/src/entities/*/query/` and the features that save through them, `apps/web/src/app/[locale]/`, `apps/web/src/widgets/`, `apps/web/src/shared/hooks/use-crud-manager.ts`, `ManagerListState` (see [web-widgets.md](web-widgets.md)) |
| `packages/ui-primitives` `StateBlock` | the one centred title, description and action block that the error and empty states of `QueryState`, `SectionLoadError` and `EditRecordGate` draw. `role="alert"` for a failure that appears after the page has loaded (`QueryState`, `EditRecordGate`); `SectionLoadError` is server-rendered with the page and stays plain | the three states above |
| `apps/web/src/shared/ui/section-load-error.tsx` | `SectionLoadError`: the error block for a server-rendered section. It takes a `retryLabel` (which calls `router.refresh()`) only on a dynamic route | the public server sections, with no retry (static pages re-serve the prerendered HTML until hourly regeneration), and the dashboard sections, with retry |
| `apps/web/src/shared/lib/media/` | image compression: `compress-in-browser.ts` (client) and `compress-image.ts` (server, sharp), both reading the config and the rules from `@byte-of-me/contracts` (`image-compression-config.ts`, `image-compression-rules.ts`); `mp4-dimensions.ts` (server, `readMp4Dimensions`: an MP4's display size from its `tkhd` box, no decoder) | 4 files: `apps/web/src/entities/media/api/`, `apps/web/src/features/dashboard/media-library/ui/image-upload.tsx` |
| `apps/web/src/shared/lib/metadata.ts` | `buildPublicPageMetadata`, `buildAlternates` (canonical, hreflang with `x-default`, RSS link), `buildSiteJsonLd` (no email), `SITE_PERSON_ID` (the `@id` blog posts reference as author), the `JsonLdObject` and `JsonLdValue` types (`shared/ui/json-ld.tsx`'s `JsonLd` takes one, so `shared/lib` does not import `shared/ui`), `buildIconSet` | the layouts under `apps/web/src/app/[locale]/` and the blog post page |
| `apps/web/src/shared/lib/brand-mark.ts` | mark geometry, `renderFaviconSvg`; source for favicons and the og card | 3 files: `apps/web/src/shared/ui/brand-mark.tsx`, `apps/web/src/shared/lib/metadata.ts`, `apps/web/src/app/api/og/route.tsx` |
| `apps/web/src/shared/lib/friendly-id.ts` | `generateFriendlyId`: 12 chars, no 0/1/i/l/o | 1 file: `apps/web/src/entities/media/` |
| `apps/web/src/shared/ui/media-cover.tsx` | `MediaCover` (pulse until drawn, then fades out), `MediaFrame` (box around one image or video), `useMediaDrawn` (checks the media at mount, then listens for load or error) | `apps/web/src/entities/blog/ui/blog-card.tsx`, `apps/web/src/entities/education/ui/education-item.tsx`, `achievement-images.tsx`, `apps/web/src/entities/featured-work/ui/featured-work-demo.tsx` |
| `apps/web/src/shared/ui/media-carousel.tsx` | `MediaCarousel`: slides as one carousel at every width, the next one only partly in view (85% on a phone, 58% from md), arrows from md, dots; `fillSingle` lets a lone slide fill the row. `media-carousel-classes.ts` holds the geometry (`MEDIA_TRACK`, `MEDIA_SLIDE`, `mediaSlideBasis`) so a server skeleton can draw the same slides. A slide that pins itself to the viewport sets `data-media-pinned` and the track drops its transform | `apps/web/src/entities/education/ui/achievement-images.tsx`, `apps/web/src/entities/featured-work/ui/featured-work-demo.tsx`, `apps/web/src/features/public/homepage-featured-works/ui/homepage-featured-works-loading.tsx` |
| `apps/web/src/shared/ui/localized-controls.tsx` | `LocalizedDatePicker`, `LocalizedMultiSelect`: the `packages/ui-forms` pickers with their text from `components.datePicker` and `components.multiSelect`, and the month and weekday names from the active locale (`react-day-picker/locale`) | dashboard forms: education, company (and its roles), project, blog meta, user profile |
| `packages/ui-primitives` `ContentFade` (`@byte-of-me/ui`) | CSS fade-in for a Suspense-resolved block, opacity only; also drawn by `QueryState` once a skeleton has shown | `apps/web/src/widgets/public/` (blog details, contact, footer), `apps/web/src/features/public/homepage-*`, `blog-live-stats.tsx`, the project and featured-work dialogs |
| `apps/web/src/shared/ui/shell.tsx` | `ShellBase`, `ShellProps`: the public page frame (`z-20 mx-auto` column, `gap-6 md:gap-8`, `pt-20 pb-12`, `md:pt-28 md:pb-16` so the top clears the 80/112px header). A page shell chooses a max-width and nothing else. Not in the `@/shared/ui` barrel: import the file | `apps/web/src/widgets/public/{homepage,contact,projects,blogs}-content/ui/*-shell.tsx`, `apps/web/src/widgets/public/blog-details-content/ui/blog-shells.tsx` |
| `apps/web/src/shared/lib/templates/sign-in-template.ts` | sign-in email HTML (`email` namespace) | 1 file: `apps/web/src/shared/lib/auth/auth.ts` |

### Client query layer

| piece | does | rule it carries |
| --- | --- | --- |
| `unwrapApiResponse<T>(res)` (`packages/api-core/src/unwrap-api-response.ts`) | returns `data` on success; throws `ServerActionError` on `{ success: false }` | the only way a query or mutation reads an envelope (AGENTS §8) |
| `ServerActionError` (same file) | `message` is the action's `errorMsg`; `errorCode` is the reason the action named, `undefined` when it named none | a refused read is an error to TanStack, never an empty list |
| `useServerMutation` (`packages/query/src/use-server-mutation.ts`) | `mutationFn` → `unwrapApiResponse`, then the success path; the failure path is `onError` | a refused write runs no success path: no toast, no closed dialog |
| `QueryState` (`packages/query/src/query-state.tsx`) | loading, error, empty, then children | the three states on every client read (AGENTS §9) |

### Dashboard CRUD kit

| piece | does | rule it carries |
| --- | --- | --- |
| `useCrudManager` (`apps/web/src/shared/hooks/use-crud-manager.ts:69`) | the page-kept list, the create or edit dialog state, the delete confirmation, and the three writes | takes `entity` (the translated noun) and `keys: CrudKeys` (`:12`). Toasts come from `dashboard.shared.crud`; a write invalidates `keys.all` and then drops `keys.detail(id)`. `save(values, { onSaved })` runs `onSaved` only after the write succeeds, so the blog form clears its autosave draft there and a refused save keeps it. The one `fetchAll` list (tech stacks) keys on `keys.all` and caches `{ data }`; its page seeds `initialItems` from a server read and does not prefetch |
| `useCrudManager` page clamp | when the last row of the last page is deleted, the page steps back to the new last page | placeholder data is skipped, because it describes the page being left |
| `useCrudManager` dirty state | none: the hook does not own the form | a dialog that owns its form passes `form.formState.isDirty` to `RecordDialog isDirty` (tag, tech stack). A form that owns its `useForm` reports through `onDirtyChange`, and its dialog keeps the flag in state and passes it on (company, education, project, featured work, blog editor) |
| `RecordDialog` (`apps/web/src/shared/ui/record-dialog.tsx:52`) | the one create or edit dialog: full screen below `md`, centred from `md`, Save submits the form named by `formId` | every close path goes through `requestClose`: blocked while `isPending`, asks through `ConfirmDiscardDialog` when `isDirty`. `hideFooter` for a read-only record. The default Save is disabled while `isPending` or `submitDisabled` is true. The seven edit dialogs (tag, tech stack, company, education, project, featured work, blog) reach it through `EditRecordDialog`, which passes `submitDisabled` while the full record loads or after its load fails. The close control's name comes from `closeLabel` (`dashboard.shared.crud.close`) |
| `ConfirmDeleteDialog` (`apps/web/src/shared/ui/confirm-delete-dialog.tsx`) | the delete prompt: `ConfirmDialog` with the destructive style and the `dashboard.shared.confirmDelete` labels | `open`, `onClose`, `onConfirm`, `isLoading`, `title`, `description`. Fourteen call sites (the managers and the repeatable fields of the company, education, profile and social-link forms) |
| `ConfirmDiscardDialog` (`apps/web/src/shared/ui/confirm-discard-dialog.tsx`) | the unsaved-changes prompt, and the profile's Reset when its form is dirty (`user-profile-manager`) | `ConfirmDialog` with the primary style: "Keep editing" closes the prompt only; "Discard" is the caller's `onDiscard`, which closes the dialog too |
| `RecordListItem`, `RecordRowActions`, `RecordListSkeleton` (`apps/web/src/shared/ui/record-list.tsx`) | one record row: optional leading, a main slot, actions | row actions are 44 px on touch and 36 px under `can-hover:`, named from `dashboard.shared.crud.editItem` and `deleteItem`. The skeleton is the same row, so a loaded row keeps its height |
| `ManagerPageLoading`, `FormSkeleton` (`apps/web/src/shared/ui/manager-page-loading.tsx:44`, `:20`) | the page header and body skeleton, for `list`, `grid` or `form` | use it for both the route `loading.tsx` and the client loading state, so the two match (AGENTS §9) |
| `ManagerListState` | loading, error, empty, then content | optional `skeleton` (default a `RecordListSkeleton`) and optional `pagination` (under the content and in the empty state). `pagination` gets no gap of its own: company, education, project and featured work pass `className="mt-6"` to `ManagerPagination` |
| `AddButton` (`apps/web/src/shared/ui/add-button.tsx`) | a "+ label" button: a manager's New in `ManagerPageHeader` or its empty state, and a form's add-row button. Small, 44px on touch (the Button's own floor), 36px with a pointer | required `label` and `onClick`; optional `variant`, `size` (`sm`, or `default` for a full-width add), `disabled`, `className`. Eighteen call sites in the dashboard managers and forms; the public "see more" buttons are not it |
| `ManagerPagination` (`apps/web/src/shared/ui/manager-pagination.tsx`) | the dashboard pager: `Pagination` with the `dashboard.shared.pagination` labels, drawn only when there is more than one page | `pagination`, `setPage`, `isPlaceholderData`, optional `className`. The nine dashboard lists pass it as `ManagerListState`'s `pagination` |
| `EditRecordDialog` (`apps/web/src/shared/ui/edit-record-dialog.tsx`) | a `RecordDialog` for a record loaded by id before it is edited | `EditRecordDialogControls` (`open`, `onOpenChange`, `isEditing`, `isLoadingInitialData`, `hasLoadError`, `onRetryLoad`, `loading`) is the contract every manager passes; the dialog adds `entity`, the descriptions, `formId`, `isDirty`, `hasRecord`, `skeleton` and the form as children. The title follows `isEditing` (set from the list row, so it does not flip while loading), the form sits behind an `EditRecordGate`, and Save is disabled while an edit has no record |
| `EditRecordGate` | holds an edit form back until its record loads | required `skeleton`, each form's own loading state (`EditRecordDialog` passes it). A failed load is a `StateBlock` with the `managerListState` error text and Retry |
| `FieldMessage` (`apps/web/src/shared/ui/form/field-message.tsx:18`) | the error text under a field, carrying the id that `FormControl` names in `aria-describedby` | reads the field's own error from the `FormField` context (no props), or shows an explicit `message` in its place (the featured-work links' list error). A `validation.<name>` message is translated through `dashboard.validation`; any other text shows as it is. Render it inside a `FormItem`. `TextField` and every dashboard field use it, not `FormMessage`, which would show the raw key; the public contact form and the sign-in form keep `FormMessage` |

### Auth helpers (`apps/web/src/shared/lib/auth/`)

| file | does | consumers |
| --- | --- | --- |
| `session.ts` | `getAuthenticatedUser`, `requireUser` (role USER or ADMIN); `getAuthenticatedAdmin`, `requireAdmin` (role ADMIN **and** owner identity) | barrel: 67 files; `apps/web/src/app/[locale]/(protected)/layout.tsx`, `apps/web/src/app/[locale]/(auth)/layout.tsx` |
| `auth.ts` | Auth.js (next-auth 5 beta): JWT sessions (7-day `maxAge`, `updateAge` 1 day), Prisma adapter, email, GitHub, Google and `-admin` twins; callbacks `signIn` (:94), `jwt` (:111), `session` (:135); exports `handlers`, `auth`, `signIn`, `signOut` | `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `session.ts`, `apps/web/src/features/auth/lib/` |
| `sign-in-policy.ts` | pure `evaluateSignIn`: email sign-in owner-only; Google and GitHub need a verified email; `-admin` ids owner-only | `auth.ts` |
| `site-owner.ts` | `isSiteOwnerEmail`: the one owner-identity check (case-insensitive, through `normalizeEmail` from `@byte-of-me/api-core`) | `session.ts`, `auth.ts`, `sign-in-policy.ts`, `apps/web/src/features/auth/lib/log-in-to-dashboard.ts` |
| `callback-url.ts` | `sanitizeCallbackUrl(from, locale)`: open-redirect and locale guard; falls back to `/{locale}/dashboard` | `apps/web/src/features/auth/lib/` (log-in-to-dashboard, log-in-to-dashboard-with-oauth, log-in-with-github, log-in-with-google) |
| `admin-oauth-providers.ts` | `ADMIN_OAUTH_PROVIDER_IDS` (`github-admin`, `google-admin`), `isAdminOAuthProviderId` | `auth.ts`, `sign-in-policy.ts` |
| `github-userinfo.ts` | `fetchGitHubProfile`: adds `email_verified` from the GitHub emails endpoint | `auth.ts` |
| `magic-link-rate-limit.ts` | `isMagicLinkRequestAllowed`: 5 mails per 600 s per IP, fails open | `auth.ts` (:103) |
| `set-test-user.test-helper.ts` | `setTestUser`, `resetTestUser` (specs only) | 24 spec files |
| `index.ts` | barrel: `admin-oauth-providers`, `auth`, `callback-url`, `session`; `site-owner` arrives via `session` | n/a |

### i18n: two systems (AGENTS §4)

| system | holds | files |
| --- | --- | --- |
| next-intl | fixed UI text in `en` and `vi` (14 namespaces) | `apps/web/messages/en.json`, `apps/web/messages/vi.json`; `apps/web/src/shared/i18n/request.ts` (wired at `apps/web/next.config.js:304`); `apps/web/src/shared/i18n/routing.ts` (locales, default `en`); `apps/web/src/shared/i18n/navigation.ts` (28 importers) |
| DB `*Translation` tables | authored content: titles, bodies, tag names | `packages/api-core/src/i18n-utils.ts`: `getTranslationLanguages(locale)` in the query, `getTranslatedContent(rows, locale)` picks locale, then `en`, then the first row |

- Client message lists per route group: `apps/web/src/shared/i18n/messages.ts` (`ROOT_MESSAGE_NAMESPACES`, `PUBLIC_MESSAGE_NAMESPACES`, `AUTH_MESSAGE_NAMESPACES`, `DASHBOARD_MESSAGE_NAMESPACES`, `PUBLIC_PRINT_MESSAGE_NAMESPACES`, `pickMessages`), used by the layouts under `apps/web/src/app/[locale]/`.
- Nested providers replace `messages` instead of merging, so each list must be complete on its own.

### Rate limit and revalidate

- `checkRateLimit({ key, limit, windowSec })` returns `{ allowed }`; one atomic upsert on `RateLimitHit` (table `rate_limit_hits`, `packages/db/prisma/schema.prisma:811`).
- Keys in use: `comment:<userId>` 5/60 s, `contact:<ip>` 3/600 s, `interaction:<userId>` 20/60 s, `view:<ip>` 60/60 s, `reading-time-ip:<ip>` 240/60 s then `reading-time:<logId>` 10/60 s (neither is written until the signed `viewed_*` cookie checks out), `magic-link:<ip>` 5/600 s.
- No shared revalidate helper. Mutating actions call `revalidateTag(CACHE_TAGS.X, 'max')` from `next/cache` after the write (AGENTS §8): 37 call sites in `apps/web/src`.
- `purgeEntireCache()` (admin-gated, `revalidatePath('/', 'layout')`) lives in `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/purge-entire-cache.ts`.
- Under `bun test`, `revalidateTag` and `revalidatePath` are no-ops (`stub-next-cache`).

### Test wiring (`apps/web/bunfig.toml` `preload`, in order)

| preload | effect |
| --- | --- |
| `apps/web/server-only-stub.ts` | `server-only` becomes an empty module; must load before `env.ts` |
| `apps/web/next-runtime-stubs.ts` | `Bun.plugin` stubs: `next-intl/server`, `next/cache` (no-op revalidate), `@/shared/lib/auth/auth` (fake `auth()`), `@/shared/lib/auth` (identity: default ADMIN owner, id `admin-1`), `@/shared/i18n/navigation` (records pushes) |
| `packages/config/test/db-guard.ts` | DB guard (below); shared with `packages/db` |
| `packages/config/test/happydom.ts` | happy-dom `Window` on `globalThis` for `*.spec.tsx`, and `IS_REACT_ACT_ENVIRONMENT = true` so React's `act` runs without a warning per call; shared with `packages/rich-text-editor`, `packages/ui-hooks`, `packages/ui-primitives`, `packages/ui-forms` and `packages/ui-carousel` |
| `apps/web/src/shared/ui/lazy-rich-text-editor.test-stub.ts` | replaces the TipTap editor for every spec |

- DB guard: `db-guard.ts` sets the two database URL env vars to a local, unreachable placeholder unconditionally, then throws if either is non-local. Bun loads `apps/web/.env` before preloads, so a `??=` default would keep production (AGENTS §10).
- Identity: specs run as the stub admin. Switch with `setTestUser`, restore with `resetTestUser` in `afterAll` or `afterEach` (24 spec files call `setTestUser`).
- Specs are `*.spec.ts(x)`, rendered with `@testing-library/react`; `mock.module()` is banned (AGENTS §10).
- Preloads are process-wide: a stub added to `bunfig.toml` affects every spec.

## Key flows

- Admin view vs action: `apps/web/src/app/[locale]/(protected)/layout.tsx` checks `getAuthenticatedAdmin()` for the view; each admin action calls `requireAdmin()` itself (AGENTS §5).
- Sign-in: `apps/web/src/shared/lib/auth/auth.ts` `signIn` runs `evaluateSignIn`, then the magic-link limit; sign-in mail is sent only from `sendVerificationRequest`, which re-checks `isSiteOwnerEmail` (`auth.ts:155`).
- Redirect target: every sign-in entry point passes `from` through `sanitizeCallbackUrl(from, locale)` (`apps/web/src/shared/lib/auth/callback-url.ts:40`).
- Public read: `handlePublicAction` (`apps/web/src/shared/api/public-action-template.ts:91`) catches, logs, and returns a generic `errorMsg` with `errorCode: 'unknown'`; it wraps `withPublicActionHandler` (`:34`), which adds the locale and optional `unstable_cache`.
- Public write: `parseInput` (`packages/api-core/src/validate-action-input.ts:41`), then `checkRateLimit` (`apps/web/src/shared/lib/rate-limit.ts:23`), then Prisma, then `revalidateTag` after the write.
- Admin list: each paginated manager's page prefetches `<entity>Queries.adminPage(1)` into a `HydrationBoundary`, and `useCrudManager` reads the same `pageKey` factory, so both use one key and one query function. Both use `ADMIN_PAGE_SIZE`. The manager also takes the entity's `keys` (its factory in `@byte-of-me/contracts/<slice>`, `packages/contracts/src/<slice>/query-keys.ts`), which supplies the toasts' noun and the invalidation root. The tech-stack page is the exception: its server read seeds `initialItems`.
- Client read: a `queryOptions` factory in `apps/web/src/entities/<slice>/query/<slice>-queries.ts` binds a key to its query function. A server `prefetchQuery` and the client hook both call that factory, so the hydrated entry is the one the hook reads (AGENTS §6).
- Client write: a component calls `useServerMutation({ mutationFn, invalidate, onSuccess })`. The `invalidate` keys come from the entity's factory in `@byte-of-me/contracts/<slice>`.
- Image upload: `compressInBrowser` (canvas) and `compressImage` (sharp, `server-only`) both apply `packages/contracts/src/image-compression-rules.ts`, so they agree on skip and size rules.

## Recipes

1. **Add a UI string.**
   1. Add the key at the same path in `apps/web/messages/en.json` and `apps/web/messages/vi.json`; `apps/web/src/shared/lib/i18n-parity.spec.ts` fails on a one-sided key.
   2. For a client component in a route group, add its namespace to that group's list in `apps/web/src/shared/i18n/messages.ts`.
   3. Run `cd apps/web && bun run build`, then `bun run check-types` (AGENTS §10 order).
2. **Rate-limit a public write.**
   1. Copy the call at `apps/web/src/entities/comment/api/post-comment.ts:49-53` (user key) or `apps/web/src/entities/contact-message/api/send-contact-message.ts:36-40` (IP key from `getClientIp(headerList)`).
   2. Use a key prefix not listed above; return the failure envelope when `allowed` is false.
3. **Add a cached public read.**
   1. Copy `apps/web/src/entities/blog/api/get-public-blog-by-slug.ts:21-22` and `:89-91`: `handlePublicAction` around `withPublicActionHandler` with `cache: true`, `cacheKey`, `cacheTags`.
   2. In the mutating action, call `revalidateTag(CACHE_TAGS.X, 'max')` after the write, as in `apps/web/src/entities/project/api/update-project.ts:103`.

## Gotchas

- `parseInput` returns `ok`, not `success`: `{ ok: false, errorMsg, errorCode: 'invalid', detail }`; `detail` is for logs only.
- `checkRateLimit` and `isMagicLinkRequestAllowed` report "allowed" on any database error. This is deliberate fail-open.
- Owner identity is the owner override, else the contact address; that address defaults to a literal at `apps/web/src/shared/config/env.ts:17`. `OWNER_EMAIL` is required when `NODE_ENV` and `VERCEL_ENV` are both `production` (see ../environment.md).
- `revalidateTag`'s second argument is `'max'` in all 38 calls; none uses `'default'`.
- `withPublicActionHandler` appends only `locale` to `unstable_cache` keys; every other input the handler closes over must be in `cacheKey` (AGENTS §8).
- Measured 2026-10-13 (`next start`): a client-invoked public action (`getPaginatedPublicBlogs`) runs its nine queries on the first call and none on identical replays, with the same body. One key with an empty result; the TTL is not measured. Page GETs never reach the wrapper: those pages are prerendered.
- Per-record tags are raw strings: `cacheTags: [CACHE_TAGS.BLOG, slug]` (`apps/web/src/entities/blog/api/get-public-blog-by-slug.ts:95`) is cleared by `revalidateTag(blog.slug, 'max')` (`apps/web/src/entities/blog/api/toggle-blog-interaction.ts:84`); change one, change both.
- `ADMIN_PAGE_SIZE` is not part of the admin query key (`packages/query/src/admin-list.ts`); a prefetch and a manager that disagree hydrate the wrong rows.
- `requireAdmin()` above an action's `try` makes the call reject, which the client sees as an error with no envelope. Inside the `try` the same refusal becomes a failure envelope. Both fail closed. The workspace-settings actions use the first form (`apps/web/src/entities/workspace-settings/api/get-admin-workspace-settings.ts`).
- `errorCode` is set only when the action names its reason. `ServerActionError.errorCode` is `undefined` otherwise, so every `errorMessages` map needs `errorMessage` as its fallback (AGENTS §9).
- `useCrudManager` (with `entity`), `RecordRowActions` and `FieldMessage` read next-intl at render. A spec that renders them needs a `NextIntlClientProvider`; without one next-intl throws `Failed to call useTranslations`.
- `FieldMessage` translates `validation.*` through the `dashboard.validation` namespace. Every client catalogue that shows it must list that namespace in `apps/web/src/shared/i18n/messages.ts`; without it the key shows as its dotted path.

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
- `apps/web/src/shared/types/index.d.ts:7` re-declares the locale set that §4 says is declared once, in `apps/web/src/shared/i18n/routing.ts:5` (§4, §11.3). The language toggle reads `routing.locales`; `shared/config/language.ts` only names each one.
- `apps/web/src/shared/config/env.ts:17,56,63,77` and `apps/web/src/shared/config/site.ts:18`: literal fallback values for environment settings (§11.7).
- `apps/web/next-runtime-stubs.ts:2`: header says "three specifiers"; the file registers five module stubs (§11.11).
- Comment blocks far longer than three lines (§11.14): `apps/web/next-runtime-stubs.ts:1-91`, `apps/web/bunfig.toml:2-28`, `apps/web/src/shared/lib/auth/site-owner.ts:7-37`.

## See also

- [web-app-routes.md](web-app-routes.md): the layouts that mount the message lists and auth guards.
- [web-entities-content.md](web-entities-content.md), [web-entities-supporting.md](web-entities-supporting.md): actions built on these helpers.
- [web-features.md](web-features.md): `apps/web/src/features/auth/` and public blog interactions.
- [web-widgets.md](web-widgets.md): dashboard managers on the CRUD and list hooks.
- [packages-ui.md](packages-ui.md): `cn`, motion and editor subpath exports.
- [tooling-and-small-packages.md](tooling-and-small-packages.md) also has `@byte-of-me/query` and `@byte-of-me/github`.
- [packages-db.md](packages-db.md): `RateLimitHit` and the Prisma client.
- [tooling-and-small-packages.md](tooling-and-small-packages.md): `@byte-of-me/api-core`, `@byte-of-me/logger`, `@byte-of-me/storage`.
- [../architecture.md](../architecture.md), [../environment.md](../environment.md).
