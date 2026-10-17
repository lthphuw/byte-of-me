# Widgets

> Composite page sections for the public site, the owner dashboard and sign-in. Source: `apps/web/src/widgets/` (`auth/`, `dashboard/`, `public/`).

## Layout

```text
apps/web/src/widgets/
├── auth/admin-auth-log-in-view/                login card, used by the login route
├── dashboard/                                  owner CMS, every dashboard route
│   ├── dashboard-sidebar/                      desktop sidebar (expandable), drawer nav, sign-out, cache purge
│   │   ├── lib/purge-entire-cache.ts           'use server'; requireAdmin, then revalidatePath
│   │   ├── lib/sidebar-state.ts                cookie dashboard-sidebar: the layout reads it, the toggle writes it
│   │   ├── lib/use-clear-cache.ts              client hook, in-flight ref guard
│   │   ├── model/use-dashboard-nav-groups.ts   the one nav list; column, rail and drawer all read it
│   │   ├── ui/dashboard-sidebar.tsx            owns the expanded state; mobile topbar and NavDrawer
│   │   ├── ui/dashboard-nav-rail.tsx           lg and up: labelled column, or the 56px icon rail
│   │   └── ui/dashboard-nav-actions.tsx        footer entries: clear cache, view site, sign out
│   ├── tag-manager/                            reference CRUD: useCrudManager + entity barrel
│   ├── featured-work-manager/                  CRUD; lib/ = form resolver, translation values, link values, reorder hook; ui/featured-work-links = the links field array
│   └── ...                                     9 more: blog, comment, company, contact-message-gallery,
│                                               education, media, project, tech-stack, user-profile
└── public/
    ├── index.ts                                re-exports the 8 public slices; app imports from here
    ├── homepage-content/                       server; a Suspense per data block
    ├── public-site-header/                     client island; lib/use-account.ts reads the next-auth session, skeleton while it loads
    └── ...                                     blog-details, blogs, contact, footer, projects
every slice: index.ts -> ui/index.ts -> ui/*.tsx (+ lib/, model/); *.spec.ts(x) sit beside the code
```

### Slices

`(group)` marks the `@/features/public` group barrel, not a slice.

| widget | group | composes | server or client |
| --- | --- | --- | --- |
| `apps/web/src/widgets/auth/admin-auth-log-in-view/` | auth | `@/features/auth` | client |
| `apps/web/src/widgets/dashboard/blog-manager/` | dashboard | `@/entities/blog`, `@/entities/blog/query`, `@/features/dashboard/blog-editor`, `@/shared/ui` | client |
| `apps/web/src/widgets/dashboard/comment-manager/` | dashboard | `@/entities/comment/query`, `@/shared/ui` | client |
| `apps/web/src/widgets/dashboard/company-manager/` | dashboard | `@/entities/company/api/*`, `@/entities/company/model`, `@/entities/company/query`, `@/entities/tech-stack/query`, `@/features/dashboard/media-library`, `@/shared/ui` | client |
| `apps/web/src/widgets/dashboard/contact-message-gallery/` | dashboard | `@/entities/contact-message`, `@/entities/contact-message/query`, `@/shared/hooks/use-server-mutation`, `@/shared/ui` | client |
| `apps/web/src/widgets/dashboard/dashboard-sidebar/` | dashboard | `@/features/auth` | client |
| `apps/web/src/widgets/dashboard/education-manager/` | dashboard | `@/entities/education`, `@/entities/education/api/*`, `@/entities/education/model`, `@/entities/education/query`, `@/entities/media/query`, `@/features/dashboard/media-library`, `@/shared/ui`, `@/shared/ui/lazy-rich-text-editor` | client |
| `apps/web/src/widgets/dashboard/featured-work-manager/` | dashboard | `@/entities/featured-work/api/*`, `@/entities/featured-work/model`, `@/entities/featured-work/query`, `@/entities/media`, `@/entities/media/query`, `@/shared/ui`, `@/shared/ui/lazy-rich-text-editor` | client |
| `apps/web/src/widgets/dashboard/media-manager/` | dashboard | `@/entities/media`, `@/entities/media/model/upload-constraints`, `@/entities/media/query`, `@/features/dashboard/media-library`, `@/shared/ui` | client |
| `apps/web/src/widgets/dashboard/project-manager/` | dashboard | `@/entities/media/query`, `@/entities/project/api/*`, `@/entities/project/model`, `@/entities/project/query`, `@/entities/project/ui/project-editor-card`, `@/entities/tag/query`, `@/entities/tech-stack/query`, `@/shared/ui`, `@/shared/ui/lazy-rich-text-editor`, `@/shared/ui/query-state` | client |
| `apps/web/src/widgets/dashboard/tag-manager/` | dashboard | `@/entities/tag`, `@/entities/tag/query`, `@/features/dashboard/tag-management`, `@/shared/ui` | client |
| `apps/web/src/widgets/dashboard/tech-stack-manager/` | dashboard | `@/entities/tech-stack/api/*`, `@/entities/tech-stack/model`, `@/entities/tech-stack/query`, `@/features/dashboard/media-library`, `@/features/dashboard/tech-stack-management`, `@/shared/ui`, `@/shared/ui/form/field-message` | client |
| `apps/web/src/widgets/dashboard/user-profile-manager/` | dashboard | `@/entities/media/query`, `@/entities/user-profile`, `@/features/dashboard/manage-social-link-form`, `@/features/dashboard/update-profile`, `@/shared/ui`, `@/shared/ui/lazy-rich-text-editor` | client |
| `apps/web/src/widgets/public/blog-details-content/` | public | `@/entities/blog`, `@/features/public` (group), `@/features/public/blog-print`, `@/shared/ui` | server entry, 7 client files |
| `apps/web/src/widgets/public/blogs-content/` | public | `@/entities/blog`, `@/entities/blog/query`, `@/features/public/blog-filters`, `@/shared/ui` | client |
| `apps/web/src/widgets/public/contact-content/` | public | `@/features/public` (group), `@/shared/ui` | server |
| `apps/web/src/widgets/public/homepage-content/` | public | `@/features/public` (group), `@/shared/ui` | server |
| `apps/web/src/widgets/public/projects-content/` | public | `@/entities/project`, `@/entities/project/query`, `@/features/public/project-filters`, `@/shared/ui`, `@/shared/ui/query-state` | client |
| `apps/web/src/widgets/public/public-site-footer/` | public | `@/features/public/public-site-footer` | server |
| `apps/web/src/widgets/public/public-site-header/` | public | `@/features/auth` | client |

## Key flows

- Home: `apps/web/src/app/[locale]/(public)/page.tsx:4,15` imports and renders `HomepageContent` (server); `apps/web/src/app/[locale]/(public)/loading.tsx:4,8` does the same for `HomepageShell`.
- Public chrome: `apps/web/src/app/[locale]/(public)/layout.tsx:12,54` mounts `PublicSiteHeader` (client); `:11,69` and `apps/web/src/app/[locale]/(auth)/layout.tsx:8,38` mount `PublicSiteFooterSection` (server).
- Blog list: `apps/web/src/app/[locale]/(public)/blogs/page.tsx:48` prefetches `blogQueries.publicList` (`apps/web/src/entities/blog/query/blog-queries.ts`), and `blogs-content.tsx:40` reads it through `usePublicBlogList`, which spreads `HYDRATED_LIST_BEHAVIOR` (`apps/web/src/shared/hooks/use-infinite-list-query.ts:19`). The list renders in `QueryState`: a skeleton while loading, an error with retry, and `BlogEmpty` when there are no posts.
- Project list: `apps/web/src/app/[locale]/(public)/projects/page.tsx:44` prefetches `projectQueries.publicList` (`apps/web/src/entities/project/query/project-queries.ts`), and `apps/web/src/widgets/public/projects-content/ui/projects-content.tsx` reads it through `usePublicProjectList`. The list renders in `QueryState`: a skeleton while loading, an error with retry, and `ProjectEmpty` when nothing matches.
- Dashboard CRUD: `apps/web/src/app/[locale]/(protected)/dashboard/tags/page.tsx:29` prefetches `tagQueries.adminPage(1)` and renders `TagManager`, which calls `useCrudManager` (`apps/web/src/shared/hooks/use-crud-manager.ts`) on the `@/entities/tag` actions. The edit dialog loads its record by id with `useAdminTagById` (`apps/web/src/entities/tag/query/use-admin-tag-by-id.ts`).
- Dashboard shell: `apps/web/src/app/[locale]/(protected)/dashboard/layout.tsx:49-52` reads the `dashboard-sidebar` cookie and mounts `DashboardSidebar` at `:75`, which renders `DashboardNavRail` (`apps/web/src/widgets/dashboard/dashboard-sidebar/ui/dashboard-sidebar.tsx:35`) and the mobile `NavDrawer` (same file, `:48`). The expanded column and the drawer share `NavDrawerGroups` (`apps/web/src/shared/ui/nav-drawer.tsx`) and `DashboardNavActions`; the toggle writes the cookie through `persistSidebarExpanded`.
- Sign-in: `apps/web/src/app/[locale]/(auth)/auth/login/page.tsx:37` renders `AdminAuthLogInView`, which passes `?from=` to each provider and shows `?error=`.
- Sign-out: `apps/web/src/widgets/public/public-site-header/lib/use-account.ts:41-54` runs `logOut()` (`apps/web/src/features/auth/lib/log-out.ts`) and next-auth `signOut` in one `useServerMutation`. On success it clears the TanStack cache and reloads the page. Until `useSession` settles, the account island and the mobile panel draw a skeleton.
- Cache purge: `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/use-clear-cache.ts` runs `purgeEntireCache()` through `useServerMutation`, with a ref that blocks a second click. `requireAdmin()` runs above the action's `try`, so a refusal rejects into the hook's toast; otherwise the action calls `revalidatePath('/', 'layout')` and returns `ApiResponse<null>`.
- Sign-out: `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/use-log-out-dashboard.ts` relies on the redirect rejecting the action: a successful sign-out redirects, and `useServerMutation` does not toast that rejection (`isRedirectSignal`). Only a refusal arrives as an envelope.

## Recipes

### 1. New dashboard manager (model: `tag-manager`)

1. Entity `apps/web/src/entities/<x>/`: `api/` (copy `apps/web/src/entities/tag/api/create-tag.ts`: guard, `parseInput`, Prisma, `revalidateTag`, `ApiResponse`), `model/` (`<x>-schema.ts`, `query-keys.ts`, `types.ts`), `index.ts` barrel.
2. Widget `apps/web/src/widgets/dashboard/<x>-manager/`: `index.ts`, `ui/index.ts`, `ui/<x>-manager.tsx` (`'use client'`, `useCrudManager`), `ui/<x>-dialog.tsx`. Model: `apps/web/src/widgets/dashboard/tag-manager/`. An edit dialog loads its record by id through a `use-admin-<x>-by-id.ts` hook (`useEditingRecord`), is an `EditRecordDialog` (`@/shared/ui/edit-record-dialog`: the title, the `EditRecordGate` and the Save lock) around the form and a `<x>-form-loading.tsx` skeleton, and the manager passes `keys` (`CrudKeys`) so a save drops the stale record. The route's `loading.tsx` renders `ManagerPageLoading` (`@/shared/ui/manager-page-loading`, variant `list` or `grid`), never a spinner.
3. Route `apps/web/src/app/[locale]/(protected)/dashboard/<path>/page.tsx`: `getQueryClient()`, `prefetchQuery(<x>Queries.adminPage(1))` from the entity's query factory, then `HydrationBoundary` with `dehydrate(queryClient)`, and render the manager. Model: `apps/web/src/app/[locale]/(protected)/dashboard/companies/page.tsx`.
4. Nav: add `{ href, label: t('items.<key>'), icon }` to `apps/web/src/widgets/dashboard/dashboard-sidebar/model/use-dashboard-nav-groups.ts`.
5. Strings: `dashboard.<x>` and `dashboard.sidebar.items.<key>` in both `apps/web/messages/en.json` and `vi.json` (AGENTS §4).

### 2. New public section (model: `homepage-content`)

1. `apps/web/src/widgets/public/<x>-content/ui/<x>-content.tsx`: no `'use client'`; wrap each data block in `<Suspense>` with a `*Loading` fallback from `@/features/public`. Model: `apps/web/src/widgets/public/homepage-content/ui/homepage-content.tsx`.
2. `ui/<x>-shell.tsx`: wraps `ShellBase` from `@/shared/ui/shell`. Model: `apps/web/src/widgets/public/homepage-content/ui/homepage-shell.tsx`.
3. Barrels: `ui/index.ts`, `index.ts`, and `export * from './<x>-content';` in `apps/web/src/widgets/public/index.ts`.
4. Route `apps/web/src/app/[locale]/(public)/<path>/page.tsx` renders the widget; `loading.tsx` renders the shell. Model: `apps/web/src/app/[locale]/(public)/page.tsx` and `loading.tsx` beside it.
5. Client code only in leaves that hold state, e.g. `apps/web/src/widgets/public/blog-details-content/ui/blog-reader-nav.tsx`.

### 3. New field on a manager form (model: `company-manager`)

1. Schema `apps/web/src/entities/company/model/company-schema.ts` (zod).
2. Fields in `apps/web/src/widgets/dashboard/company-manager/ui/company-form.tsx`; `company-dialog.tsx` only wraps it in `EditRecordDialog`.
3. Server `apps/web/src/entities/company/api/create-company.ts` and `update-company.ts` validate with `parseInput(companySchema, ...)`; the Prisma write must carry the field.
4. Labels in both `en.json` and `vi.json`.

## Gotchas

- `purgeEntireCache` is not in `apps/web/src/shared/lib/revalidate.ts` as AGENTS §6 says; that file does not exist. The function is `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/purge-entire-cache.ts`.
- Shell exports are uneven: the `ui/index.ts` barrels of blogs, projects and blog-details export their shell; homepage and contact do not, so `apps/web/src/app/[locale]/(public)/loading.tsx:4` and `apps/web/src/app/[locale]/(public)/contact/loading.tsx:4` deep-import theirs.
- `apps/web/src/widgets/dashboard/education-manager/ui/index.tsx` is the only `ui/` barrel with a `.tsx` extension.
- `apps/web/src/widgets/dashboard/education-manager/ui/education-form.tsx:32-41` lazy-loads the achievements editor with `dynamic(..., { ssr: false })`, so it loads as its own chunk; it renders only inside the dialog.
- 13 `'use server'` files sit in `apps/web/src/features/*/lib/`, and the purge action is a 14th file outside `entities/*/api/`. Find them with `rg -l "^'use server'" apps/web/src`.
- Specs that swap methods on the real `prisma` singleton with `Object.defineProperty` and restore them in `afterAll`: the widget specs `company-manager`, `education-manager` and `featured-work-manager`, and the `refusal.spec.ts` files in `apps/web/src/entities/{blog,company,education,featured-work,project,tag,tech-stack,user-profile}/api/`. `apps/web/src/widgets/dashboard/company-manager/ui/company-manager.spec.tsx` swaps at `:101-114` and restores at `:189-192`.

## Run

```bash
bun run --filter 'web' test          # bun test; widget specs are co-located *.spec.ts(x)
bun run --filter 'web' check-types   # tsc --noEmit
bun run --filter 'web' lint          # eslint .
bun run check                        # repo root: types, lint, test, build
```

## AGENTS.md deviations

Clean: no `@/app` import from `widgets/`; no `@/widgets` import from `features/`, `entities/` or `shared/`; no root `@/entities` or `@/features` barrel import in `widgets/`.

- `apps/web/src/widgets/dashboard/featured-work-manager/ui/featured-work-manager.tsx:3-36`: §3 says cross-slice imports go through the slice barrel; widgets deep-import instead. Totals: 86 lines in 39 non-spec files (71 `@/entities/<slice>/<file>`, 15 `@/features/<group>/<slice>/<file>`); 7 spec files add 15 more. Other large cases: `apps/web/src/widgets/dashboard/company-manager/ui/company-manager.tsx:12-19`, `apps/web/src/widgets/dashboard/education-manager/ui/education-manager.tsx:14-20`, `apps/web/src/widgets/dashboard/tech-stack-manager/ui/tech-stack-manager.tsx:9-14`. The slice barrels export `api` and `model`, except company (`model` only) and education (its `api/` barrel has only the public read).
- Features, same rule: `apps/web/src/widgets/auth/admin-auth-log-in-view/ui/admin-auth-log-in-view.tsx:12` (`@/features/auth/ui`), `apps/web/src/widgets/dashboard/dashboard-sidebar/lib/use-log-out-dashboard.ts:5` (`@/features/auth/lib`), `apps/web/src/widgets/public/public-site-header/lib/use-account.ts:7` (`@/features/auth/lib/log-out`). The barrel `apps/web/src/features/auth/index.ts` exports all three segments.
- §3 `public/` rule: `apps/web/src/widgets/public/blogs-content/ui/blogs-content.tsx:34-40` requests owner-only drafts (`includeDrafts`) when the session role is `ADMIN`. The server gates it (`apps/web/src/entities/blog/api/get-paginated-public-blogs.ts:63`, `getAuthenticatedAdmin`) and skips the cache for drafts (`:175`). Gated, not leaked, but §3 says a `public/` slice may never reach an owner capability.
- §4 i18n: the breadcrumb and reading-progress labels are catalogue strings (`blogDetails.breadcrumb`, `blogDetails.readingProgress`). The progress bar is a client file, so its label is passed in from `blog-details-content.tsx`.
- §11.11 stale comment: `apps/web/src/widgets/dashboard/dashboard-sidebar/model/use-dashboard-nav-groups.ts:22` cites `use-space-nav-items.ts`, which exists nowhere in the repo.

## See also

- [Web app routes](web-app-routes.md): the pages that mount these widgets
- [Web features](web-features.md): the `@/features/*` slices composed here
- [Web entities, content](web-entities-content.md) and [Web entities, supporting](web-entities-supporting.md): the `@/entities/*` slices composed here
- [Web shared](web-shared.md): `useCrudManager`, `requireAdmin`, `RevealSection`, `NavDrawer`
- [Packages UI](packages-ui.md): `ShellBase`, `Icons`, `ConfirmDialog`
- [Architecture](../architecture.md)
