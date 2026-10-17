# Web features
> User-facing capabilities by surface: `public`, `dashboard`, `auth`. Source: `apps/web/src/features`.

## Layout

```
apps/web/src/features/
├── auth/                  one slice, no sub-groups: sign-in and sign-out; no slice barrel (callers import lib/ and ui/ by path)
│   ├── lib/               six 'use server' actions
│   ├── model/             userAuthLoginSchema (zod)
│   └── ui/                AuthModal (client), AdminAuthForm, Github/GoogleAuthButton
├── public/                20 slices, no owner capability
│   ├── index.ts           ROOT BARREL: all 20 (imported by server files only)
│   └── <slice>/
│       ├── index.ts       export * from './ui' (and './lib' where it exists)
│       ├── lib/           'use server' actions, pure helpers, use-*.ts hooks
│       └── ui/            components; *-loading.tsx = skeletons (Suspense fallbacks in homepage-content)
└── dashboard/             9 slices, owner only
    ├── index.ts           ROOT BARREL: all 9
    └── <slice>/           same shape; lib/ server functions call requireAdmin() (both do today)
```

### Slices (30)

| Feature | Group | Purpose | Entities and shared it imports | Mounted by |
| --- | --- | --- | --- | --- |
| `auth` | auth | Owner magic link, GitHub and Google sign-in (visitor or admin), AuthModal, logout | entities: none; shared: `@/shared/lib/auth`, `@/shared/config/env`, `@/shared/lib/utils`, `@byte-of-me/api-core`, `@byte-of-me/query` | `apps/web/src/widgets/auth/admin-auth-log-in-view`; `apps/web/src/widgets/dashboard/dashboard-sidebar`; `apps/web/src/widgets/public/public-site-header/lib/use-account.ts`; AuthModal inside public features |
| `blog-adjacent-nav` | public | Previous and next post links | entities: `blog`; shared: `@/shared/i18n/navigation` | `apps/web/src/widgets/public/blog-details-content` |
| `blog-analytics` | public | Records a post view and reading time, rate-limited | entities: none; shared: `@/shared/api`, `@/shared/config/env` (`AUTH_SECRET` signs the cookie), `@/shared/lib/rate-limit`, `@/shared/lib/utils`, `@byte-of-me/query`, `@byte-of-me/api-core`, `@byte-of-me/api-core/server` | `apps/web/src/widgets/public/blog-details-content` |
| `blog-author-card` | public | Author card on a post | entities: `blog`, `user-profile`; shared: none | `apps/web/src/widgets/public/blog-details-content` |
| `blog-comment` | public | Comment list and compose (infinite query), signed-out prompt | entities: `comment` (`query/` hooks `useCommentInfiniteQuery`, `usePostComment`); feature `auth` (deep) | `apps/web/src/widgets/public/blog-details-content` |
| `blog-filters` | public | Tag and search filters on `/blogs`, URL-synced | entities: `tag`; shared: `@byte-of-me/api-core`, `@byte-of-me/query` (`useUrlSyncedSearch`, `HYDRATED_LIST_BEHAVIOR`), `@/shared/i18n/navigation`, `@/shared/ui` | `apps/web/src/widgets/public/blogs-content` (deep); `apps/web/src/app/[locale]/(public)/blogs/page.tsx` (constants) |
| `blog-print` | public | Print route trigger and print path | entities: none; packages: `@byte-of-me/ui-hooks` (`usePrintOnFontsReady`), `@byte-of-me/ui-primitives` (`Button`) | `apps/web/src/app/[locale]/(print)/print/blogs/[slug]/page.tsx`; `apps/web/src/widgets/public/blog-details-content` |
| `blog-related-posts` | public | Related posts under a post | entities: `blog`; shared: none | `apps/web/src/widgets/public/blog-details-content` |
| `blog-related-project` | public | Linked project card on a post | entities: `project`; shared: `@/shared/config/global`, `@/shared/lib/utils`, `@byte-of-me/api-core` (`toSafeHref`) | `apps/web/src/widgets/public/blog-details-content` |
| `blog-stats` | public | Live view and reading-time counts in the post header, with a retry on failure | entities: `blog` (`query/` hook `usePublicBlogStats`); packages: `@byte-of-me/ui` (`ContentFade`) | `apps/web/src/widgets/public/blog-details-content/ui/blog-content-header.tsx` |
| `contact-infos` | public | Public contact channels | entities: `social-link`; shared: `@/shared/config/env`, `@/shared/i18n/navigation`, `@byte-of-me/ui` (`ContentFade` on the resolved channels) | `apps/web/src/widgets/public/contact-content`; `apps/web/src/app/[locale]/(public)/contact/loading.tsx` |
| `contact-me` | public | Contact form, writes a contact message | entities: `contact-message`; shared: `@byte-of-me/query`, `@byte-of-me/api-core`, `@byte-of-me/contracts/contact-message` | `apps/web/src/widgets/public/contact-content` |
| `homepage-cta` | public | Contact call to action on the homepage | entities: none; shared: `@/shared/config/global`, `@/shared/i18n/navigation` | `apps/web/src/widgets/public/homepage-content` |
| `homepage-education` | public | Education list on the homepage | entities: `education`; shared: `@/shared/ui` (`SectionLoadError`), `@byte-of-me/ui` (`ContentFade`) | `apps/web/src/widgets/public/homepage-content` |
| `homepage-featured-works` | public | Featured works on the homepage: each card is a title with its proof links as plain text (`#number` for a pull request, else the label or host), the demo, then the details clamped to three lines with a toggle when longer | entities: `featured-work`; shared: `@/shared/lib/utils`, `@/shared/ui` (`SectionLoadError`), `@byte-of-me/ui` (`ContentFade`) | `apps/web/src/widgets/public/homepage-content` |
| `homepage-open-source` | public | Open-source contributions on the homepage: the top 3 repos, each a `RepoRow` (`ui/repo-row.tsx`) that is no longer one link out. Two buttons: `Contributions` opens `/projects` narrowed to that repo (`openSourceHref(repo)`, in the same tab) and `Repository` opens GitHub in a new tab. Below `md` the buttons sit under the text, aligned to it by `pl-10` (the avatar plus its gap), and from `md` they sit to the right; the skeleton mirrors both layouts | entities: `open-source` (`RepoSummary`, `openSourceHref`); shared: `@/shared/i18n/navigation`, `@/shared/ui` (`SectionLoadError`), `@byte-of-me/ui` (`Button`, `ContentFade`) | `apps/web/src/widgets/public/homepage-content` |
| `homepage-profile` | public | Hero profile, with empty and loading states | entities: `user-profile`; shared: `@/shared/config/global`, `@/shared/i18n/navigation` | `apps/web/src/widgets/public/homepage-content` |
| `project-filters` | public | Tag and tech-stack filters on `/projects`, URL-synced. Each chip row shows a skeleton while it loads, a Retry when it fails with nothing loaded, and is hidden when it has no chips | entities: `tag` (`query/` hook `useTagInfiniteQuery`), `tech-stack` (`query/` hook `useTechStackInfiniteQuery`); shared: `@byte-of-me/api-core`, `@byte-of-me/query` (`HYDRATED_LIST_BEHAVIOR`, `useUrlSyncedSearch`), `@/shared/i18n/navigation`, `@/shared/ui` | `apps/web/src/widgets/public/projects-content` (deep); `apps/web/src/app/[locale]/(public)/projects/page.tsx` (constants) |
| `projects-open-source` | public | Client ledger of merged PRs on `/projects`: text search (title, repo, `#number`; hidden behind `SEARCH_ENABLED` in `projects-open-source.tsx`), repo filter as chips (`repo-filter-chips.tsx`: one pressed at a time, no dropdown and no repo header), month groups, 5 per page below `md` and 8 from `md` up (`LEDGER_PAGE_SIZE`, read with `useMediaQuery`); the pressed repo is the `?repo=` search parameter (`resolveLedgerRepo`: a name that is not in the list shows every repo), applied once hydrated with `useHydrated` so the static HTML still matches, and a chip click is a `router.replace` to `openSourceHref`; on a row the repo name links to the repo and the `View` badge to the PR (the row does not link). Below `md` the meta is a two-column grid: repo and date on line one, then the row's `Diffstat` (`+A −D` and five squares, shown at every width) with `View` on the same line, `View` at the right edge. From `md` it is one flex line, repo, date and diffstat with dots between them and `View` pushed right by `md:ml-auto`; a long repo name or date wraps inside its own cell and never moves `View`. Both links and the chips keep a 44px hit area through `before:`; dates formatted in UTC | entities: `open-source` (`Diffstat`, `openSourceHref`, `OPEN_SOURCE_REPO_PARAM`); shared: `@/shared/i18n/navigation`, `@/shared/ui` (`FilterSearchInput`); packages: `@byte-of-me/github` (ledger helpers, `OpenSourceRepo`), `@byte-of-me/ui` (`Badge`, `Pagination`, `useHydrated`, `useMediaQuery`) | `apps/web/src/app/[locale]/(public)/projects/page.tsx` |
| `public-site-footer` | public | Footer navigation and social links | entities: `social-link`; shared: `@/shared/config/site`, `@/shared/config/global`, `@/shared/i18n/navigation`, `@/shared/api`, `@byte-of-me/api-core`, `@/shared/lib/utils`; widget wraps it in `ContentFade` (`@byte-of-me/ui`) | `apps/web/src/widgets/public/public-site-footer/ui` |
| `toggle-blog-interactions` | public | Like and clap buttons on a post, one button component and one hook for both; a signed-out click opens AuthModal | entities: `blog` (the actions live in `entities/blog/api`; reads through `useBlogInteractionState`); shared: `@byte-of-me/query`, `@byte-of-me/api-core`, `@byte-of-me/contracts/blog` (`blogKeys`), `@/shared/lib/utils`; feature `auth` (deep) | `apps/web/src/widgets/public/blog-details-content/ui/blog-action-bar.tsx` |
| `blog-analytics-overview` | dashboard | Thirty-day views and interactions, top five posts, cached five minutes | entities: none; shared: `@/shared/lib/auth`, `@byte-of-me/api-core`, `@/shared/lib/utils` | `apps/web/src/app/[locale]/(protected)/dashboard/page.tsx` |
| `blog-editor` | dashboard | Create and edit blog dialog and form (TipTap, autosave) | entities: `blog`, `project`, `tag`, `media`; shared: `@/shared/ui`, `@/shared/ui/lazy-rich-text-editor`; packages: `@byte-of-me/ui` (`useFormAutosave`), `@byte-of-me/contracts` (`richTextDocSchema`) and `@byte-of-me/contracts/blog`, `@byte-of-me/rich-text-schema/rich-text-content` (`parseRichTextContent`); feature `media-library` (deep) | `apps/web/src/widgets/dashboard/blog-manager` |
| `dashboard-profile` | dashboard | Profile summary card | entities: `user-profile`; shared: `@/shared/ui` (`SectionLoadError`) | `apps/web/src/app/[locale]/(protected)/dashboard/page.tsx` |
| `dashboard-stats` | dashboard | Counts for seven tables plus new messages, cached per owner | entities: none; shared: `@/shared/lib/auth`, `@byte-of-me/api-core`, `@/shared/lib/utils`, `@/shared/ui` (`SectionLoadError`) | `apps/web/src/app/[locale]/(protected)/dashboard/page.tsx` |
| `manage-social-link-form` | dashboard | Social-link editor on the profile | entities: none; shared: `@/shared/ui`; packages: `@byte-of-me/contracts/user-profile` (`UserProfileFormValues`) | `apps/web/src/widgets/dashboard/user-profile-manager` |
| `media-library` | dashboard | Upload, compress and pick media (single and multi) through `ui/media-picker-grid.tsx` and `ui/media-picker-upload-dialog.tsx` | entities: `media`, `workspace-settings`; packages: `@byte-of-me/contracts` (the image-compression config) and `@byte-of-me/contracts/media`, `@byte-of-me/query` (`QueryState`); shared: `@/shared/lib/media/compress-in-browser`, `@/shared/lib/utils`, `@/shared/types/models`, `@/shared/ui/record-dialog` | `apps/web/src/widgets/dashboard/media-manager`, `apps/web/src/widgets/dashboard/education-manager`, `apps/web/src/widgets/dashboard/company-manager`, `apps/web/src/widgets/dashboard/tech-stack-manager`; feature `blog-editor` |
| `tag-management` | dashboard | Tag cards | entities: `tag` (`tagDisplayName`); shared: `@/shared/ui` | `apps/web/src/widgets/dashboard/tag-manager` |
| `tech-stack-management` | dashboard | Tech-stack rows (`TechStackCard`), each a shared record row (`RecordListItem` with `RecordRowActions`). The picker hook `useTechStackOptions` lives in `entities/tech-stack/query`; the company dialog imports it from there | entities: `tech-stack` (`query/` hook `useTechStackOptions`); shared: `@/shared/ui` (`RecordListItem`, `RecordRowActions`) | `apps/web/src/widgets/dashboard/tech-stack-manager` |
| `update-profile` | dashboard | Profile load and save controller, with translations; form-state helpers in `profile-form-state.ts` | entities: `user-profile` (root barrel, `query/`); shared: `@/shared/ui`, `@byte-of-me/query`, `@byte-of-me/contracts/user-profile` | `apps/web/src/widgets/dashboard/user-profile-manager` |

## Key flows

- Like or clap: the server component `apps/web/src/features/public/toggle-blog-interactions/ui/blog-interaction-wrapper.tsx` seeds `ui/blog-interaction-button.tsx`, which calls `lib/use-blog-interaction.ts`. That hook toggles through `apps/web/src/entities/blog/api/toggle-blog-interaction.ts` (rate limit, `requireUser`, `parseInput`, Prisma, `revalidateTag(blog.slug)`) via `useServerMutation`. A signed-out click opens `apps/web/src/features/auth/ui/auth-modal.tsx`.
- Post view: `apps/web/src/features/public/blog-analytics/ui/blog-analytics.tsx` runs `trackBlogView` and `updateBlogReadingTime` through `useServerMutation`. Both actions return `ApiResponse` and are thin wrappers over `lib/blog-view-log.ts`: `recordBlogView` (published blog only, `blogStatisticLog.create`, `referrer` cut to 512) and `recordReadingTime` (`blogStatisticLog.update`). The `viewed_<blogId>` cookie holds `<logId>.<HMAC-SHA256 keyed with AUTH_SECRET>` (`lib/view-token.ts`); `recordReadingTime` accepts a `logId` only when a cookie verifies for it, and a bare-id cookie from before the signing counts as no cookie. A failure answers `PUBLIC_ACTION_FAILURE_MESSAGE`; the detail goes to the log.
- Owner sign-in: `apps/web/src/widgets/auth/admin-auth-log-in-view/ui/admin-auth-log-in-view.tsx` mounts `apps/web/src/features/auth/ui/form/admin-auth-form.tsx`, which sends the link through `useServerMutation` to `apps/web/src/features/auth/lib/log-in-to-dashboard.ts` (owner email only, then the next-auth `email` provider).
- OAuth branch: `apps/web/src/features/auth/ui/github-auth-button.tsx` runs `logInToDashboardWithOAuth` when `surface === 'admin'`, else `logInWithGithub`, through `useServerMutation`; `google-auth-button.tsx` is the same.
- Dashboard numbers: `apps/web/src/app/[locale]/(protected)/dashboard/page.tsx` mounts `apps/web/src/features/dashboard/dashboard-stats/ui/stats-grid.tsx`, which calls `lib/get-dashboard-stats.ts` (`requireAdmin()`, then `unstable_cache` keyed by user id, tagged per table).
- Blog save: `apps/web/src/features/dashboard/blog-editor/ui/blog-editor-dialog.tsx` renders `ui/form/blog-form.tsx` (`@byte-of-me/contracts/blog` for `blogFormSchema`, `media/query` (`useScopedImageUploader`), `useFormAutosave` from `packages/ui-forms/src/use-form-autosave.ts`, `LazyRichTextEditor`). `useFormAutosave` snapshots the form to localStorage 1.2 s after the last change, and writes a change still waiting when the form unmounts; `clear` (run once a save lands) and `discard` empty it, so a saved post leaves no draft. A stored draft that is not `{ savedAt: number, values: object }` is removed instead of offered, and every storage call tolerates a blocked or full store.
- URL filters: `apps/web/src/features/public/blog-filters/ui/blog-filters.tsx` uses `lib/use-blog-filter.ts` and `lib/blog-filter-params.ts` (`buildBlogFilterQuery`) to build the query string.

## Recipes

**Add a public homepage section**

1. Create `apps/web/src/features/public/<name>/` with `index.ts` (`export * from './ui';`), `ui/index.ts`, and `ui/<name>.tsx`; add `ui/<name>-loading.tsx` if it needs a skeleton. Pattern: `apps/web/src/features/public/homepage-education/`.
2. Add `export * from './<name>';` to `apps/web/src/features/public/index.ts`.
3. Mount it in `apps/web/src/widgets/public/homepage-content/ui/homepage-content.tsx` inside `<Suspense fallback={<…Loading />}>` (the sections already there show the shape).

**Add a dashboard feature**

1. Create `apps/web/src/features/dashboard/<name>/` with `index.ts`, `ui/`, and `lib/` if it reads data. Pattern: `apps/web/src/features/dashboard/dashboard-stats/`.
2. Start each `lib/` server file with `'use server'` and call `requireAdmin()` from `@/shared/lib/auth` before the `try` (`apps/web/src/features/dashboard/dashboard-stats/lib/get-dashboard-stats.ts`).
3. Add `export * from './<name>';` to `apps/web/src/features/dashboard/index.ts`, and import it in `apps/web/src/app/[locale]/(protected)/dashboard/page.tsx`. Or import the slice path from a widget, as `apps/web/src/widgets/dashboard/tag-manager/ui/tag-manager.tsx` does for `@/features/dashboard/tag-management`.

**Add a feature-owned write action**

1. Create `lib/<verb>-<noun>.ts` with `'use server'`. Copy `apps/web/src/entities/blog/api/toggle-blog-interaction.ts`: `requireUser()`, then `parseInput(schema, data)`, `checkRateLimit`, the write, then `revalidateTag` after it.
2. Re-export it from that slice's `lib/index.ts`.
3. Spec: replace Prisma delegates with `Object.defineProperty(prisma, 'blog', …)` as in `apps/web/src/entities/blog/api/toggle-blog-interaction.spec.ts`. Do not `spyOn` a delegate method (AGENTS §10).
4. If the action is about an entity's data, put it in `apps/web/src/entities/<slice>/api/` instead (AGENTS §8). The like and clap writes are the example: they moved there from this slice's `lib/`.

## Gotchas

- `apps/web/src/features/public/index.ts` and `apps/web/src/features/dashboard/index.ts` are root barrels. Their 11 importers are server files today (`rg -l "from '@/features/(public|dashboard)'" apps/web/src`). Client files must use slice paths (`@/entities` has no root barrel at all).
- `apps/web/src/entities/{tag,media,tech-stack,comment,blog}/index.ts` do not re-export `query/`. Import hooks from `@/entities/<slice>/query`, as `apps/web/src/features/public/blog-filters/ui/blog-filters.tsx` does.
- `requireAdmin()` stays outside the `unstable_cache` callback, which runs with no cookies, headers or session. Pass the owner id or locale into the key instead (`apps/web/src/features/dashboard/dashboard-stats/lib/get-dashboard-stats.ts`, `apps/web/src/features/dashboard/blog-analytics-overview/lib/get-analytics-overview.ts`).
- `toggle-blog-interaction` takes `_blogSlug` and ignores it: a caller's slug would let any signed-in visitor purge any tag. The purged tag comes from the blog row (`apps/web/src/entities/blog/api/toggle-blog-interaction.ts`).
- Five feature `lib/` files query Prisma from `@byte-of-me/db` directly, not through `entities/*/api`: blog-view-log (behind track-blog-view and update-blog-reading-time), get-public-info-for-footer, get-analytics-overview, get-dashboard-stats. A schema change reaches them too.
- `logInToDashboard` accepts only the owner's email (`isSiteOwnerEmail`) and answers every failure, non-owner or SMTP, with the one message `Invalid email, try again later`; its comment says neither input is logged (`apps/web/src/features/auth/lib/log-in-to-dashboard.ts`).
- Pass `redirectTo` to next-auth `signIn`, not `callbackUrl`, or the magic link returns to the sign-in page (`apps/web/src/features/auth/lib/log-in-to-dashboard.ts`; the comment there explains the Auth.js v5 rename).
- The redirecting auth actions (`logInWithGithub`, `logInWithGoogle`, `logInToDashboardWithOAuth`, `logOutDashboard`) return `ApiResponse`, but a successful redirect never returns. Next 16.3.8 rejects the action promise with a `NEXT_REDIRECT` error (`apps/web/node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js:241-262`). A client wrapper has to treat that rejection as the success path, not as a failure to toast.

## Run

```
bun run --filter 'web' test                    # apps/web bun test; includes the 13 feature *.spec files
bun run --filter 'web' check-types             # tsc --noEmit
bun run --filter 'web' lint                    # eslint .
cd apps/web && bun test src/features/public    # one subtree, run from the workspace (AGENTS §10)
```

## AGENTS.md deviations

- `apps/web/src/features/dashboard/blog-editor/ui/form/blog-meta-fields.tsx` — §3: reaches into another feature's internals (`media-library/ui/media-select`). Fix: `@/features/dashboard/media-library`.
- Deep entity imports, 38 non-spec lines (`rg -o "from '@/entities/[^'/]+/[^']+'" apps/web/src/features -g '!*.spec.*'`), §3 barrel rule:
  - 12 target a module the slice barrel already re-exports, e.g. `getRelatedPublicBlogs` in `apps/web/src/features/public/blog-related-posts/ui/blog-related-posts.tsx` (re-exported by `apps/web/src/entities/blog/api/index.ts`). Fix: import `@/entities/<slice>`.
  - 2 target a module the barrel omits: `apps/web/src/features/dashboard/blog-editor/lib/use-blog-reference-options.ts` and `apps/web/src/features/dashboard/blog-editor/ui/form/blog-meta-fields.tsx` (both import the `ProjectOption` type from `project/api/get-admin-project-options`).
  - 17 import `query/`, which no slice barrel re-exports (see Gotchas), e.g. `apps/web/src/features/public/blog-filters/ui/blog-filters.tsx` and `apps/web/src/features/dashboard/media-library/ui/media-select.tsx`.
  - 7 target `featured-work`, `open-source` or `social-link`, which have no barrel: not deviations.
- `apps/web/src/entities/blog/api/toggle-blog-interaction.ts` — §6 table says `revalidateTag(CACHE_TAGS.X)`; this uses the post's slug as a per-post tag (`revalidateTag(blog.slug, 'max')`). Deliberate: the comment above the call says why.

Checked clean (rg, re-run after the package split): no `@/widgets` or `@/app` import; no `@/entities` root-barrel import; no `public/` slice reaches `requireAdmin` or `getAuthenticatedAdmin`; no inline query keys, `any`, `@ts-ignore`, `mock.module` or `jest.mock`; `console.*` appears once, a client-side `console.error` in `features/dashboard/update-profile/lib/use-profile-controller.tsx` (AGENTS §8 bans it in server code only). Direct `@byte-of-me/ui|db|logger` imports are allowed: AGENTS §3 lets a layer import the layers below it, and packages sit below shared.

## See also

- [web-app-routes.md](web-app-routes.md) — the routes that mount the root barrels and the print feature.
- [web-widgets.md](web-widgets.md) — the widgets that mount each slice.
- [web-entities-content.md](web-entities-content.md) and [web-entities-supporting.md](web-entities-supporting.md) — the entities imported above.
- [web-shared.md](web-shared.md) — `@/shared/lib/auth`, `rate-limit`, and the shared hooks.
- [packages-ui.md](packages-ui.md) and [packages-db.md](packages-db.md) — `@byte-of-me/ui` and the Prisma client.
- [../architecture.md](../architecture.md) — layer diagram.
