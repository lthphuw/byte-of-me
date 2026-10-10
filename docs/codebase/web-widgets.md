# Widgets

> Composite page sections for the public site, the owner dashboard and sign-in. Source: `apps/web/src/widgets/` (`auth/`, `dashboard/`, `public/`).

## Layout

```text
apps/web/src/widgets/
├── auth/admin-auth-log-in-view/                login card, used by the login route
├── dashboard/                                  owner CMS, every dashboard route
│   ├── dashboard-sidebar/                      rail + drawer nav, sign-out, cache purge
│   │   ├── lib/purge-entire-cache.ts           'use server'; requireAdmin, then revalidatePath
│   │   ├── lib/use-clear-cache.ts              client hook, in-flight ref guard
│   │   └── model/use-dashboard-nav-groups.ts   the one nav list; rail and drawer both read it
│   ├── tag-manager/                            reference CRUD: useCrudManager + entity barrel
│   ├── featured-work-manager/                  CRUD; lib/ = form resolver, translation values, reorder hook
│   └── ...                                     9 more: blog, comment, company, contact-message-gallery,
│                                               education, media, project, tech-stack, user-profile
└── public/
    ├── index.ts                                re-exports the 8 public slices; app imports from here
    ├── homepage-content/                       server; a Suspense per data block
    ├── public-site-header/                     client island; lib/use-account.ts reads the next-auth session
    └── ...                                     blog-details, blogs, contact, experience, footer, projects
every slice: index.ts -> ui/index.ts -> ui/*.tsx (+ lib/, model/); *.spec.ts(x) sit beside the code
```

### Slices

`(group)` marks the `@/features/public` group barrel, not a slice.

| widget | group | composes | server or client |
| --- | --- | --- | --- |
| `apps/web/src/widgets/auth/admin-auth-log-in-view/` | auth | `@/features/auth` | client |
| `apps/web/src/widgets/dashboard/blog-manager/` | dashboard | `@/entities/blog`, `@/features/dashboard/blog-editor` | client |
| `apps/web/src/widgets/dashboard/comment-manager/` | dashboard | `@/entities/comment` | client |
| `apps/web/src/widgets/dashboard/company-manager/` | dashboard | `@/entities/company`, `@/entities/media`, `@/entities/tech-stack`, `@/features/dashboard/media-library`, `@/features/dashboard/tech-stack-management` | client |
| `apps/web/src/widgets/dashboard/contact-message-gallery/` | dashboard | `@/entities/contact-message` | client |
| `apps/web/src/widgets/dashboard/dashboard-sidebar/` | dashboard | `@/features/auth` | client |
| `apps/web/src/widgets/dashboard/education-manager/` | dashboard | `@/entities/education`, `@/entities/media`, `@/features/dashboard/media-library` | client |
| `apps/web/src/widgets/dashboard/featured-work-manager/` | dashboard | `@/entities/featured-work`, `@/entities/media` | client |
| `apps/web/src/widgets/dashboard/media-manager/` | dashboard | `@/entities/media`, `@/features/dashboard/media-library` | client |
| `apps/web/src/widgets/dashboard/project-manager/` | dashboard | `@/entities/media`, `@/entities/project`, `@/entities/tag`, `@/entities/tech-stack`, `@/features/dashboard/tech-stack-management` | client |
| `apps/web/src/widgets/dashboard/tag-manager/` | dashboard | `@/entities/tag`, `@/features/dashboard/tag-management` | client |
| `apps/web/src/widgets/dashboard/tech-stack-manager/` | dashboard | `@/entities/tech-stack`, `@/features/dashboard/media-library`, `@/features/dashboard/tech-stack-management` | client |
| `apps/web/src/widgets/dashboard/user-profile-manager/` | dashboard | `@/entities/media`, `@/entities/user-profile`, `@/features/dashboard/manage-social-link-form`, `@/features/dashboard/update-profile` | client |
| `apps/web/src/widgets/public/blog-details-content/` | public | `@/entities/blog`, `@/features/public` (group), `@/features/public/blog-print` | server entry, 7 client files |
| `apps/web/src/widgets/public/blogs-content/` | public | `@/entities/blog`, `@/features/public/blog-filters` | client |
| `apps/web/src/widgets/public/contact-content/` | public | `@/features/public` (group) | server |
| `apps/web/src/widgets/public/experience-content/` | public | `@/entities/company` | server, not mounted |
| `apps/web/src/widgets/public/homepage-content/` | public | `@/features/public` (group) | server |
| `apps/web/src/widgets/public/projects-content/` | public | `@/entities/project`, `@/features/public/project-filters` | client |
| `apps/web/src/widgets/public/public-site-footer/` | public | `@/features/public/public-site-footer` | server |
| `apps/web/src/widgets/public/public-site-header/` | public | `@/features/auth` | client |

## Key flows

- Home: `apps/web/src/app/[locale]/(public)/page.tsx:4,15` imports and renders `HomepageContent` (server); `apps/web/src/app/[locale]/(public)/loading.tsx:4,8` does the same for `HomepageShell`.
- Public chrome: `apps/web/src/app/[locale]/(public)/layout.tsx:12,54` mounts `PublicSiteHeader` (client); `:11,69` and `apps/web/src/app/[locale]/(auth)/layout.tsx:8,38` mount `PublicSiteFooterSection` (server).
- Blog list: `apps/web/src/app/[locale]/(public)/blogs/page.tsx:49,71` dehydrates `blogKeys.publicList`; `apps/web/src/widgets/public/blogs-content/ui/blogs-content.tsx:35` hydrates it with `useQuery` and `HYDRATED_LIST_BEHAVIOR` (`apps/web/src/shared/hooks/use-infinite-list-query.ts:20`).
- Dashboard CRUD: `apps/web/src/app/[locale]/(protected)/dashboard/tags/page.tsx:4-6,35` prefetches `tagKeys` and renders `TagManager`, which calls `useCrudManager` (`apps/web/src/shared/hooks/use-crud-manager.ts`) on the `@/entities/tag` actions.
- Dashboard shell: `apps/web/src/app/[locale]/(protected)/dashboard/layout.tsx:13,69` mounts `DashboardSidebar`, which renders `DashboardNavRail` (`apps/web/src/widgets/dashboard/dashboard-sidebar/ui/dashboard-sidebar.tsx:38`) and `NavDrawer` (same file, `:51`).
- Sign-in: `apps/web/src/app/[locale]/(auth)/auth/login/page.tsx:31` renders `AdminAuthLogInView`, which passes `?from=` to each provider and shows `?error=`.
- Sign-out: `apps/web/src/widgets/public/public-site-header/lib/use-account.ts:42` clears the TanStack cache, then calls `logOut()` (`apps/web/src/features/auth/lib/log-out.ts`) and next-auth `signOut`.
- Cache purge: `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/use-clear-cache.ts` blocks double clicks and calls `purgeEntireCache()`, which runs `requireAdmin()` and `revalidatePath('/', 'layout')`.

## Recipes

### 1. New dashboard manager (model: `tag-manager`)

1. Entity `apps/web/src/entities/<x>/`: `api/` (copy `apps/web/src/entities/tag/api/create-tag.ts`: guard, `parseInput`, Prisma, `revalidateTag`, `ApiResponse`), `model/` (`<x>-schema.ts`, `query-keys.ts`, `types.ts`), `index.ts` barrel.
2. Widget `apps/web/src/widgets/dashboard/<x>-manager/`: `index.ts`, `ui/index.ts`, `ui/<x>-manager.tsx` (`'use client'`, `useCrudManager`), `ui/<x>-dialog.tsx`. Model: `apps/web/src/widgets/dashboard/tag-manager/`.
3. Route `apps/web/src/app/[locale]/(protected)/dashboard/<path>/page.tsx`: prefetch with the same key factory (`prefetchAdminPage`, `HydrationBoundary`), then render the manager. Model: `apps/web/src/app/[locale]/(protected)/dashboard/tags/page.tsx`.
4. Nav: add `{ href, label: t('items.<key>'), icon }` to `apps/web/src/widgets/dashboard/dashboard-sidebar/model/use-dashboard-nav-groups.ts`.
5. Strings: `dashboard.<x>` and `dashboard.sidebar.items.<key>` in both `apps/web/messages/en.json` and `vi.json` (AGENTS §4).

### 2. New public section (model: `homepage-content`)

1. `apps/web/src/widgets/public/<x>-content/ui/<x>-content.tsx`: no `'use client'`; wrap each data block in `<Suspense>` with a `*Loading` fallback from `@/features/public`. Model: `apps/web/src/widgets/public/homepage-content/ui/homepage-content.tsx`.
2. `ui/<x>-shell.tsx`: wraps `ShellBase` from `@byte-of-me/ui`. Model: `apps/web/src/widgets/public/homepage-content/ui/homepage-shell.tsx`.
3. Barrels: `ui/index.ts`, `index.ts`, and `export * from './<x>-content';` in `apps/web/src/widgets/public/index.ts`.
4. Route `apps/web/src/app/[locale]/(public)/<path>/page.tsx` renders the widget; `loading.tsx` renders the shell. Model: `apps/web/src/app/[locale]/(public)/page.tsx` and `loading.tsx` beside it.
5. Client code only in leaves that hold state, e.g. `apps/web/src/widgets/public/blog-details-content/ui/blog-reader-nav.tsx`.

### 3. New field on a manager form (model: `company-manager`)

1. Schema `apps/web/src/entities/company/model/company-schema.ts` (zod).
2. Fields in `apps/web/src/widgets/dashboard/company-manager/ui/company-form.tsx`; `company-dialog.tsx` only wraps it in a `Dialog`.
3. Server `apps/web/src/entities/company/api/create-company.ts` and `update-company.ts` validate with `parseInput(companySchema, ...)`; the Prisma write must carry the field.
4. Labels in both `en.json` and `vi.json`.

## Gotchas

- `purgeEntireCache` is not in `apps/web/src/shared/lib/revalidate.ts` as AGENTS §6 says; that file does not exist. The function is `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/purge-entire-cache.ts`.
- `experience-content` is unmounted: `apps/web/src/app/[locale]/(public)/experience/page.tsx` redirects to `/`, and its comment gives the restore step. Only that route's `loading.tsx` still uses `ExperienceShell`.
- Shell exports are uneven: the `ui/index.ts` barrels of blogs, projects, experience and blog-details export their shell; homepage and contact do not, so `apps/web/src/app/[locale]/(public)/loading.tsx:4` and `apps/web/src/app/[locale]/(public)/contact/loading.tsx:4` deep-import theirs.
- `apps/web/src/widgets/dashboard/education-manager/ui/index.tsx` is the only `ui/` barrel with a `.tsx` extension.
- `apps/web/src/widgets/dashboard/education-manager/ui/education-form.tsx:38-44` lazy-loads a field with `dynamic(..., { ssr: false })`.
- 13 `'use server'` files sit in `apps/web/src/features/*/lib/`, and the purge action is a 14th file outside `entities/*/api/`. Find them with `rg -l "^'use server'" apps/web/src`.
- Three specs (`company-manager`, `education-manager`, `featured-work-manager`) swap methods on the real `prisma` singleton with `Object.defineProperty` and restore them afterwards (`apps/web/src/widgets/dashboard/company-manager/ui/company-manager.spec.tsx:91-99`, restore at `:175-177`).

## Run

```bash
bun run --filter 'web' test          # bun test; widget specs are co-located *.spec.ts(x)
bun run --filter 'web' check-types   # tsc --noEmit
bun run --filter 'web' lint          # eslint .
bun run check                        # repo root: types, lint, test, build
```

## AGENTS.md deviations

Clean: no `@/app` import from `widgets/`; no `@/widgets` import from `features/`, `entities/` or `shared/`; no root `@/entities` or `@/features` barrel import in `widgets/`.

- `apps/web/src/widgets/dashboard/featured-work-manager/ui/featured-work-manager.tsx:18-25`: §3 says cross-slice imports go through the slice barrel; widgets deep-import instead. Totals: 86 lines in 39 non-spec files (71 `@/entities/<slice>/<file>`, 15 `@/features/<group>/<slice>/<file>`); 7 spec files add 15 more. Other large cases: `apps/web/src/widgets/dashboard/company-manager/ui/company-manager.tsx:17-24`, `apps/web/src/widgets/dashboard/education-manager/ui/education-manager.tsx:18-24`, `apps/web/src/widgets/dashboard/tech-stack-manager/ui/tech-stack-manager.tsx:11-16`. The slice barrels already export `api` and `model`.
- Features, same rule: `apps/web/src/widgets/auth/admin-auth-log-in-view/ui/admin-auth-log-in-view.tsx:12` (`@/features/auth/ui`), `apps/web/src/widgets/dashboard/dashboard-sidebar/ui/dashboard-sidebar.tsx:8` and `.../dashboard-nav-rail.tsx:12` (`@/features/auth/lib`), `apps/web/src/widgets/public/public-site-header/lib/use-account.ts:8` (`@/features/auth/lib/log-out`). The barrel `apps/web/src/features/auth/index.ts` exports all three segments.
- §3 `public/` rule: `apps/web/src/widgets/public/blogs-content/ui/blogs-content.tsx:31-43` requests owner-only drafts (`includeDrafts`) when the session role is `ADMIN`. The server gates it (`apps/web/src/entities/blog/api/get-paginated-public-blogs.ts:65`, `getAuthenticatedAdmin`) and skips the cache for drafts (`:177`). Gated, not leaked, but §3 says a `public/` slice may never reach an owner capability.
- §8 envelope: `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/purge-entire-cache.ts:12-15` returns `{ success, errorMsg? }`, not `ApiResponse<T>` (`apps/web/src/shared/types/api/api-response.type.ts:10`).
- §4 i18n: `apps/web/src/widgets/public/blog-details-content/ui/blog-breadcrumb.tsx:12` (`aria-label="Breadcrumb"`) and `.../blog-reading-progress.tsx:34` (`aria-label="Reading progress"`) are hardcoded English UI text.
- §11.11 stale comment: `apps/web/src/widgets/dashboard/dashboard-sidebar/model/use-dashboard-nav-groups.ts:22` cites `use-space-nav-items.ts`, which exists nowhere in the repo.
- §11.14 comment length: `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/use-clear-cache.ts:9-26` is an 18-line docblock where the rule allows three lines. Similar blocks recur across the slice.

## See also

- [Web app routes](web-app-routes.md): the pages that mount these widgets
- [Web features](web-features.md): the `@/features/*` slices composed here
- [Web entities, content](web-entities-content.md) and [Web entities, supporting](web-entities-supporting.md): the `@/entities/*` slices composed here
- [Web shared](web-shared.md): `useCrudManager`, `requireAdmin`, `RevealSection`, `NavDrawer`
- [Packages UI](packages-ui.md): `ShellBase`, `Icons`, `ConfirmDeleteDialog`
- [Architecture](../architecture.md)
