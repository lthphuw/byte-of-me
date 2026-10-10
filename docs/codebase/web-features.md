# Web features
> User-facing capabilities by surface: `public`, `dashboard`, `auth`. Source: `apps/web/src/features`.

## Layout

```
apps/web/src/features/
├── auth/                  one slice, no sub-groups: sign-in and sign-out
│   ├── index.ts           re-exports lib, model, ui
│   ├── lib/               six 'use server' actions
│   ├── model/             userAuthLoginSchema (zod)
│   └── ui/                AuthModal (client), AdminAuthForm, Github/GoogleAuthButton
├── public/                21 slices, no owner capability
│   ├── index.ts           ROOT BARREL: all 21 (imported by server files only)
│   └── <slice>/
│       ├── index.ts       export * from './ui' (and './lib' where it exists)
│       ├── lib/           'use server' actions, pure helpers, use-*.ts hooks
│       └── ui/            components; *-loading.tsx = skeletons (Suspense fallbacks in homepage-content)
└── dashboard/             9 slices, owner only
    ├── index.ts           ROOT BARREL: all 9
    └── <slice>/           same shape; lib/ server functions call requireAdmin() (both do today)
```

### Slices (31)

| Feature | Group | Purpose | Entities and shared it imports | Mounted by |
| --- | --- | --- | --- | --- |
| `auth` | auth | Owner magic link, GitHub and Google sign-in (visitor or admin), AuthModal, logout | entities: none; shared: `@/shared/lib/auth`, `@/shared/config/env`, `@/shared/lib/utils`, `@/shared/types/api/api-response.type` | `apps/web/src/widgets/auth/admin-auth-log-in-view`; `apps/web/src/widgets/dashboard/dashboard-sidebar`; `apps/web/src/widgets/public/public-site-header/lib/use-account.ts`; AuthModal inside public features |
| `blog-adjacent-nav` | public | Previous and next post links | entities: `blog`; shared: `@/shared/i18n/navigation` | `apps/web/src/widgets/public/blog-details-content` |
| `blog-analytics` | public | Records a post view and reading time, rate-limited | entities: none; shared: `@/shared/lib/rate-limit`, `@/shared/lib/client-ip`, `@/shared/lib/public-input-schema`, `@/shared/lib/utils` | `apps/web/src/widgets/public/blog-details-content` |
| `blog-author-card` | public | Author card on a post | entities: `blog`, `user-profile`; shared: none | `apps/web/src/widgets/public/blog-details-content` |
| `blog-comment` | public | Comment list and compose (infinite query), signed-out prompt | entities: `comment`; shared: `@/shared/types/api`; feature `auth` (deep) | `apps/web/src/widgets/public/blog-details-content` |
| `blog-filters` | public | Tag and search filters on `/blogs`, URL-synced | entities: `tag`; shared: `@/shared/lib/filter-params`, `@/shared/hooks/use-url-synced-search`, `@/shared/hooks/use-infinite-list-query`, `@/shared/i18n/navigation`, `@/shared/ui` | `apps/web/src/widgets/public/blogs-content` (deep); `apps/web/src/app/[locale]/(public)/blogs/page.tsx` (constants) |
| `blog-print` | public | Print route trigger and print path | entities: none; shared: `@/shared/hooks/use-print-on-fonts-ready` | `apps/web/src/app/[locale]/(print)/print/blogs/[slug]/page.tsx`; `apps/web/src/widgets/public/blog-details-content` |
| `blog-related-posts` | public | Related posts under a post | entities: `blog`; shared: none | `apps/web/src/widgets/public/blog-details-content` |
| `blog-related-project` | public | Linked project card on a post | entities: `project`; shared: `@/shared/config/global`, `@/shared/lib/utils` | `apps/web/src/widgets/public/blog-details-content` |
| `blog-stats` | public | Live view and interaction counts in the post header | entities: `blog`; shared: none | `apps/web/src/widgets/public/blog-details-content/ui/blog-content-header.tsx` |
| `contact-infos` | public | Public contact channels | entities: `social-link`; shared: `@/shared/config/env`, `@/shared/i18n/navigation`, `@/shared/ui/content-fade` (`ContentFade` on the resolved channels) | `apps/web/src/widgets/public/contact-content`; `apps/web/src/app/[locale]/(public)/contact/loading.tsx` |
| `contact-me` | public | Contact form, writes a contact message | entities: `contact-message`; shared: none | `apps/web/src/widgets/public/contact-content` |
| `homepage-cta` | public | Contact call to action on the homepage | entities: none; shared: `@/shared/config/global`, `@/shared/i18n/navigation` | `apps/web/src/widgets/public/homepage-content` |
| `homepage-education` | public | Education list on the homepage | entities: `education`; shared: `@/shared/ui` (`ContentFade`) | `apps/web/src/widgets/public/homepage-content` |
| `homepage-featured-works` | public | Featured works on the homepage | entities: `featured-work`; shared: `@/shared/lib/utils`, `@/shared/ui` (`ContentFade`) | `apps/web/src/widgets/public/homepage-content` |
| `homepage-open-source` | public | Open-source contributions on the homepage | entities: `open-source`; shared: `@/shared/config/global`, `@/shared/i18n/navigation`, `@/shared/ui` (`ContentFade`) | `apps/web/src/widgets/public/homepage-content` |
| `homepage-profile` | public | Hero profile, with empty and loading states | entities: `user-profile`; shared: `@/shared/config/global`, `@/shared/i18n/navigation` | `apps/web/src/widgets/public/homepage-content` |
| `homepage-tech-stack` | public | Tech-stack badges on the homepage | entities: `tech-stack`; shared: `@/shared/ui` (`ContentFade`) | `apps/web/src/widgets/public/homepage-content` |
| `project-filters` | public | Tag and tech-stack filters on `/projects`, URL-synced | entities: `tag`, `tech-stack`; shared: `@/shared/lib/filter-params`, `@/shared/hooks/use-infinite-list-query`, `@/shared/hooks/use-url-synced-search`, `@/shared/i18n/navigation`, `@/shared/ui` | `apps/web/src/widgets/public/projects-content` (deep); `apps/web/src/app/[locale]/(public)/projects/page.tsx` (constants) |
| `projects-open-source` | public | Open-source repo grid on `/projects` | entities: `open-source`; shared: none | `apps/web/src/app/[locale]/(public)/projects/page.tsx` |
| `public-site-footer` | public | Footer navigation and social links | entities: `social-link`; shared: `@/shared/config/site`, `@/shared/config/global`, `@/shared/i18n/navigation`, `@/shared/api`, `@/shared/lib/constants`, `@/shared/lib/i18n-utils`, `@/shared/lib/utils`, `@/shared/types/api/api-response.type`; widget wraps it in `@/shared/ui/content-fade` | `apps/web/src/widgets/public/public-site-footer/ui` |
| `toggle-blog-interactions` | public | Like and clap buttons on a post; a signed-out click opens AuthModal | entities: `blog`; shared: `@/shared/lib/auth`, `@/shared/lib/constants`, `@/shared/lib/rate-limit`, `@/shared/lib/validate-action-input`, `@/shared/lib/utils`, `@/shared/types/api/api-response.type`; feature `auth` (deep) | `apps/web/src/widgets/public/blog-details-content/ui/blog-action-bar.tsx` |
| `blog-analytics-overview` | dashboard | Thirty-day views and interactions, top five posts, cached five minutes | entities: none; shared: `@/shared/lib/auth`, `@/shared/lib/constants`, `@/shared/lib/i18n-utils`, `@/shared/lib/utils` | `apps/web/src/app/[locale]/(protected)/dashboard/page.tsx` |
| `blog-editor` | dashboard | Create and edit blog dialog and form (TipTap, autosave) | entities: `blog`, `project`, `tag`, `media`; shared: `@/shared/ui`, `@/shared/ui/lazy-rich-text-editor`, `@/shared/hooks/use-form-autosave`, `@/shared/lib/query/unwrap-api-response`; feature `media-library` (deep) | `apps/web/src/widgets/dashboard/blog-manager` |
| `dashboard-profile` | dashboard | Profile summary card | entities: `user-profile`; shared: none | `apps/web/src/app/[locale]/(protected)/dashboard/page.tsx` |
| `dashboard-stats` | dashboard | Counts for seven tables plus new messages, cached per owner | entities: none; shared: `@/shared/lib/auth`, `@/shared/lib/constants`, `@/shared/lib/utils` | `apps/web/src/app/[locale]/(protected)/dashboard/page.tsx` |
| `manage-social-link-form` | dashboard | Social-link editor on the profile | entities: `user-profile`; shared: none | `apps/web/src/widgets/dashboard/user-profile-manager` |
| `media-library` | dashboard | Upload, compress and pick media (single and multi) | entities: `media`, `workspace-settings`; shared: `@/shared/lib/media/image-compression-config`, `@/shared/lib/media/compress-in-browser`, `@/shared/lib/utils`, `@/shared/types/models` | `apps/web/src/widgets/dashboard/media-manager`, `apps/web/src/widgets/dashboard/education-manager`, `apps/web/src/widgets/dashboard/company-manager`, `apps/web/src/widgets/dashboard/tech-stack-manager`; feature `blog-editor` |
| `tag-management` | dashboard | Tag cards | entities: `tag`; shared: `@/shared/lib/i18n-utils` | `apps/web/src/widgets/dashboard/tag-manager` |
| `tech-stack-management` | dashboard | Tech-stack cards and option lists | entities: `tech-stack`; shared: none | `apps/web/src/widgets/dashboard/company-manager`, `apps/web/src/widgets/dashboard/project-manager`, `apps/web/src/widgets/dashboard/tech-stack-manager` |
| `update-profile` | dashboard | Profile load and save controller, with translations | entities: `user-profile`; shared: `@/shared/ui` | `apps/web/src/widgets/dashboard/user-profile-manager` |

## Key flows

- Like or clap: `apps/web/src/features/public/toggle-blog-interactions/ui/like-button.tsx` calls `lib/toggle-blog-interaction.ts` (rate limit, `requireUser`, `parseInput`, Prisma, `revalidateTag(blog.slug)`); a signed-out click opens `apps/web/src/features/auth/ui/auth-modal.tsx`.
- Post view: `apps/web/src/features/public/blog-analytics/ui/blog-analytics.tsx` calls `lib/track-blog-view.ts` (`blogStatisticLog.create`), then `lib/update-blog-reading-time.ts` (`blogStatisticLog.update`).
- Owner sign-in: `apps/web/src/widgets/auth/admin-auth-log-in-view/ui/admin-auth-log-in-view.tsx` mounts `apps/web/src/features/auth/ui/form/admin-auth-form.tsx`, which calls `apps/web/src/features/auth/lib/log-in-to-dashboard.ts` (owner email only, then the next-auth `email` provider).
- OAuth branch: `apps/web/src/features/auth/ui/github-auth-button.tsx:22-27` calls `logInToDashboardWithOAuth` when `surface === 'admin'`, else `logInWithGithub`; `google-auth-button.tsx` is the same.
- Dashboard numbers: `apps/web/src/app/[locale]/(protected)/dashboard/page.tsx` mounts `apps/web/src/features/dashboard/dashboard-stats/ui/stats-grid.tsx`, which calls `lib/get-dashboard-stats.ts` (`requireAdmin()`, then `unstable_cache` keyed by user id, tagged per table).
- Blog save: `apps/web/src/features/dashboard/blog-editor/ui/blog-editor-dialog.tsx` renders `ui/form/blog-form.tsx` (`blog/model/blog-schema`, `media/api/upload-single-media`, `use-form-autosave`, `LazyRichTextEditor`).
- URL filters: `apps/web/src/features/public/blog-filters/ui/blog-filters.tsx` uses `lib/use-blog-filter.ts` and `lib/blog-filter-params.ts` (`buildBlogFilterQuery`) to build the query string.

## Recipes

**Add a public homepage section**

1. Create `apps/web/src/features/public/<name>/` with `index.ts` (`export * from './ui';`), `ui/index.ts`, and `ui/<name>.tsx`; add `ui/<name>-loading.tsx` if it needs a skeleton. Pattern: `apps/web/src/features/public/homepage-education/`.
2. Add `export * from './<name>';` to `apps/web/src/features/public/index.ts`.
3. Mount it in `apps/web/src/widgets/public/homepage-content/ui/homepage-content.tsx` inside `<Suspense fallback={<…Loading />}>` (lines 39-41 show the shape).

**Add a dashboard feature**

1. Create `apps/web/src/features/dashboard/<name>/` with `index.ts`, `ui/`, and `lib/` if it reads data. Pattern: `apps/web/src/features/dashboard/dashboard-stats/`.
2. Start each `lib/` server file with `'use server'` and call `requireAdmin()` from `@/shared/lib/auth` inside its body (`apps/web/src/features/dashboard/dashboard-stats/lib/get-dashboard-stats.ts:137`).
3. Add `export * from './<name>';` to `apps/web/src/features/dashboard/index.ts`, and import it in `apps/web/src/app/[locale]/(protected)/dashboard/page.tsx`. Or import the slice path from a widget, as `apps/web/src/widgets/dashboard/tag-manager/ui/tag-manager.tsx` does for `@/features/dashboard/tag-management`.

**Add a feature-owned write action**

1. Create `lib/<verb>-<noun>.ts` with `'use server'`. Copy `apps/web/src/features/public/toggle-blog-interactions/lib/toggle-blog-interaction.ts`: `requireUser()` (line 25), `parseInput(schema, data)` (27), `checkRateLimit` (35), the write, then `revalidateTag` after it (80).
2. Re-export it from that slice's `lib/index.ts`.
3. Spec: replace Prisma delegates with `Object.defineProperty(prisma, 'blog', …)` as in `apps/web/src/features/public/toggle-blog-interactions/lib/toggle-blog-interaction.spec.ts:21`. Do not `spyOn` a delegate method (AGENTS §10).
4. If the action is about an entity's data, put it in `apps/web/src/entities/<slice>/api/` instead (AGENTS §8).

## Gotchas

- `apps/web/src/features/public/index.ts` and `apps/web/src/features/dashboard/index.ts` are root barrels. Their 9 importers are server files today. Client files must use slice paths (AGENTS §3 gives the same rule for `@/entities`).
- `apps/web/src/entities/{tag,media,tech-stack,comment}/index.ts` do not re-export `query/`. Import hooks from `@/entities/<slice>/query`, as `apps/web/src/features/public/blog-filters/ui/blog-filters.tsx:7` does.
- `requireAdmin()` stays outside the `unstable_cache` callback, which runs with no cookies, headers or session. Pass the owner id or locale into the key instead (`apps/web/src/features/dashboard/dashboard-stats/lib/get-dashboard-stats.ts:129-142`, `apps/web/src/features/dashboard/blog-analytics-overview/lib/get-analytics-overview.ts:262-279`).
- `toggle-blog-interaction` takes `_blogSlug` and ignores it: a caller's slug would let any signed-in visitor purge any tag. The purged tag comes from the blog row (`apps/web/src/features/public/toggle-blog-interactions/lib/toggle-blog-interaction.ts:20-22`, `:80`).
- Seven feature `lib/` files query Prisma from `@byte-of-me/db` directly, not through `entities/*/api`: track-blog-view, update-blog-reading-time, get-public-info-for-footer, get-blog-interactions-for-user, toggle-blog-interaction, get-analytics-overview, get-dashboard-stats. A schema change reaches them too.
- `logInToDashboard` accepts only the owner's email (`isSiteOwnerEmail`); its comment says neither input is logged (`apps/web/src/features/auth/lib/log-in-to-dashboard.ts:26-29`).
- Pass `redirectTo` to next-auth `signIn`, not `callbackUrl`, or the magic link returns to the sign-in page (`apps/web/src/features/auth/lib/log-in-to-dashboard.ts:33-46`; the comment there explains the Auth.js v5 rename).

## Run

```
bun run --filter 'web' test                    # apps/web bun test; includes the 8 feature *.spec files
bun run --filter 'web' check-types             # tsc --noEmit
bun run --filter 'web' lint                    # eslint .
cd apps/web && bun test src/features/public    # one subtree, run from the workspace (AGENTS §10)
```

## AGENTS.md deviations

- `apps/web/src/features/public/blog-comment/ui/blog-comment-section.tsx:26` — §3 barrel rule: deep import into another slice (`@/features/auth/ui/auth-modal`). Fix: `@/features/auth`.
- `apps/web/src/features/public/toggle-blog-interactions/ui/clap-button.tsx:12` — same import, same fix.
- `apps/web/src/features/public/toggle-blog-interactions/ui/like-button.tsx:13` — same import, same fix.
- `apps/web/src/features/dashboard/blog-editor/ui/form/blog-meta-fields.tsx:24` — §3: reaches into another feature's internals (`media-library/ui/media-select`). Fix: `@/features/dashboard/media-library`.
- Deep entity imports, 45 non-spec lines (`rg -o "from '@/entities/[^'/]+/[^']+'" apps/web/src/features -g '!*.spec.*'`), §3 barrel rule:
  - 35 target a module the slice barrel already re-exports, e.g. `apps/web/src/features/public/blog-related-posts/ui/blog-related-posts.tsx:1` (re-exported at `apps/web/src/entities/blog/api/index.ts:15`). Fix: import `@/entities/<slice>`.
  - 3 target a module the barrel omits: `apps/web/src/features/public/homepage-featured-works/ui/homepage-featured-works-loading.tsx:10`, `apps/web/src/features/dashboard/blog-editor/lib/use-blog-reference-options.ts:11`, `apps/web/src/features/dashboard/blog-editor/ui/form/blog-meta-fields.tsx:23` (type-only).
  - 7 import `query/`, which no slice barrel re-exports (see Gotchas): `apps/web/src/features/public/blog-filters/ui/blog-filters.tsx:7`, `apps/web/src/features/public/project-filters/ui/project-filters.tsx:8` and `:10`, `apps/web/src/features/public/blog-comment/ui/blog-comment-section.tsx:25`, `apps/web/src/features/dashboard/media-library/ui/media-select.tsx:22`, `apps/web/src/features/dashboard/media-library/ui/media-multi-select.tsx:16`, `apps/web/src/features/dashboard/blog-editor/lib/use-blog-reference-options.ts:13`.
- `apps/web/src/features/public/toggle-blog-interactions/lib/toggle-blog-interaction.ts:80` — §6 table says `revalidateTag(CACHE_TAGS.X)`; this uses the post's slug as a per-post tag. Deliberate, documented at `:79` and `apps/web/src/features/dashboard/blog-analytics-overview/lib/get-analytics-overview.ts:27`.

Checked clean (rg, 2026-10-10): no `@/widgets` or `@/app` import; no `@/entities` root-barrel import; no `public/` slice reaches `requireAdmin` or `getAuthenticatedAdmin`; no inline query keys, `console.*`, `any`, `@ts-ignore`, `mock.module` or `jest.mock`. Direct `@byte-of-me/ui|db|logger` imports are allowed: AGENTS §3 lets a layer import the layers below it, and packages sit below shared.

## See also

- [web-app-routes.md](web-app-routes.md) — the routes that mount the root barrels and the print feature.
- [web-widgets.md](web-widgets.md) — the widgets that mount each slice.
- [web-entities-content.md](web-entities-content.md) and [web-entities-supporting.md](web-entities-supporting.md) — the entities imported above.
- [web-shared.md](web-shared.md) — `@/shared/lib/auth`, `rate-limit`, and the shared hooks.
- [packages-ui.md](packages-ui.md) and [packages-db.md](packages-db.md) — `@byte-of-me/ui` and the Prisma client.
- [../architecture.md](../architecture.md) — layer diagram.
