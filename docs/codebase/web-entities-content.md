# Web entities: content

> Content entities (blog, company, education, featured-work) and the root barrel. Source: `apps/web/src/entities/{blog,company,education,featured-work}`, `apps/web/src/entities/index.ts`.

## Layout

```
apps/web/src/entities/                 (* = 'use client')
├── index.ts                           root barrel: 12 slices; omits featured-work, workspace-settings
├── blog/
│   ├── api/                           create|update|delete-blog (admin) + 10 get-*; toggle-blog-interaction; 2 plain modules
│   ├── model/                         blog-schema.ts  types.ts  query-keys.ts (blogKeys)
│   ├── query/                         blog-queries.ts (blogQueries) + 4 hooks: publicList, stats, admin by id, interaction state
│   ├── ui/                            blog-card*, blog-card-skeleton, blog-editor-card*, blog-empty*
│   └── index.ts                       export * from api, model, ui
├── company/
│   ├── api/                           create|update|delete-company (admin) + 2 get-*
│   ├── model/                         company-schema.ts  types.ts  query-keys.ts (companyKeys)
│   ├── query/                         company-queries.ts (companyQueries: adminPage, adminById) + use-admin-company-by-id
│   └── index.ts                       model only; ./ui export commented out (line 2); no api/index.ts, no ui/ folder
├── education/
│   ├── api/                           create|update|delete-education (admin) + 3 get-*
│   ├── model/                         education-schema.ts  types.ts  query-keys.ts (educationKeys)
│   ├── query/                         education-queries.ts (educationQueries: adminPage, adminById) + use-admin-education-by-id
│   ├── ui/                            education-item, achievement-item*, achievement-fold*, achievement-images*
│   └── index.ts                       api + model + ui
└── featured-work/
    ├── api/                           create|update|delete|reorder-featured-work (admin) + 3 get-*
    ├── lib/                           featured-work-media, featured-work-links, load-public-featured-works,
    │                                  get-featured-work-github, fetch-featured-work-github,
    │                                  parse-github-pull-request-url, github-pull-request-query, safe-link
    ├── model/                         featured-work-schema.ts  types.ts  query-keys.ts (featuredWorkKeys)
    ├── query/                         featured-work-queries.ts (featuredWorkQueries: adminPage, adminById) + use-admin-featured-work-by-id
    ├── ui/                            featured-work-row, featured-work-item*, featured-work-link*, featured-work-demo*, use-demo-zoom, featured-work-row-classes
    └── index.ts                       api + model + ui
```

### Entity map

Action names are files in `apps/web/src/entities/<slice>/api/`. "admin" = `requireAdmin()`; "before `try`" = the guard runs outside the `try` block.

| Entity | Model types | Server action files | Per action: guard · validate · revalidate | Query keys | Main UI folder |
| --- | --- | --- | --- | --- | --- |
| blog | `apps/web/src/entities/blog/model/types.ts` | `create-blog`, `update-blog`, `delete-blog`, `toggle-blog-interaction`, 10 × `get-*` (`get-public-feed-blogs`, `get-published-blogs` are plain modules) | `create`: admin (before `try`) · parse `blogFormSchema` · BLOG `max`<br>`update`: admin (before `try`) · parse id + `blogFormSchema` · BLOG `max`<br>`delete`: admin (before `try`) · parse id · BLOG `max`<br>`get-admin-blog-by-id`: admin (before `try`) · parse id · —<br>`get-paginated-admin-blogs`: admin (before `try`) · `clampPagination` · —<br>`get-paginated-public-blogs`: public (admin only for `includeDrafts`) · parse `publicBlogsParamsSchema` · cache BLOG, not for drafts<br>`get-public-blog-by-slug`: public · `if (!slug)` · cache BLOG + slug<br>`get-related-public-blogs`: public · parse `relatedPublicBlogsParamsSchema` · cache BLOG<br>`get-adjacent-public-blogs`: public · none · cache BLOG<br>`get-public-blog-stats`: public · parse `cuidSchema` · uncached<br>`get-blog-interactions-for-user`: optional session · parse `blogId` + `interaction` · uncached, envelope on failure<br>`toggle-blog-interaction`: `requireUser` · parse · 20 per min per user · BLOG tag = the post's slug, `max`<br>`get-public-feed-blogs`, `get-published-blogs`: no guard · none · none, raw return | `apps/web/src/entities/blog/model/query-keys.ts` (`blogKeys`); reads through `apps/web/src/entities/blog/query/blog-queries.ts` (`blogQueries`) | `apps/web/src/entities/blog/ui/`; admin `apps/web/src/widgets/dashboard/blog-manager/ui/` and `apps/web/src/features/dashboard/blog-editor/ui/`; public `apps/web/src/widgets/public/blogs-content/ui/` |
| company | `apps/web/src/entities/company/model/types.ts` | `create-company`, `update-company`, `delete-company`, 2 × `get-*` | `create`: admin · parse `companySchema` · COMPANY `max`<br>`update`: admin · parse id + `companySchema` · COMPANY `max` (after transaction)<br>`delete`: admin · parse id · COMPANY `max`<br>`get-admin-company-by-id`: admin · parse id · —<br>`get-paginated-admin-companies`: admin · `clampPagination` · — | `apps/web/src/entities/company/model/query-keys.ts` (`companyKeys`); `query/company-queries.ts` (`companyQueries`: `adminPage`, `adminById`); hook `useAdminCompanyById` | none in the slice; admin `apps/web/src/widgets/dashboard/company-manager/ui/` |
| education | `apps/web/src/entities/education/model/types.ts` | `create-education`, `update-education`, `delete-education`, 3 × `get-*` | `create`: admin · parse `educationSchema` · EDUCATION `max`<br>`update`: admin · parse id + `educationSchema` · EDUCATION `max` (after transaction)<br>`delete`: admin · parse id · EDUCATION `max`<br>`get-admin-education-by-id`: admin · parse id · —<br>`get-paginated-admin-educations`: admin · `clampPagination` · —<br>`get-all-public-educations`: public · none · cache EDUCATION | `apps/web/src/entities/education/model/query-keys.ts` (`educationKeys`); `query/education-queries.ts` (`educationQueries`: `adminPage`, `adminById`); hook `useAdminEducationById` | `apps/web/src/entities/education/ui/`; admin `apps/web/src/widgets/dashboard/education-manager/ui/`; public `apps/web/src/features/public/homepage-education/ui/` |
| featured-work | `apps/web/src/entities/featured-work/model/types.ts` | `create-featured-work`, `update-featured-work`, `delete-featured-work`, `reorder-featured-work`, 3 × `get-*` | `create`: admin (before `try`) · parse `featuredWorkSchema` + `ownsAllMedia` · FEATURED_WORK `max` · writes `links` with the work (`toLinkRows`)<br>`update`: admin (before `try`) · parse id + `featuredWorkSchema` + `ownsAllMedia` · FEATURED_WORK `max` (after transaction) · `links` replaced when sent, kept when omitted<br>`delete`: admin (before `try`) · parse id · FEATURED_WORK `max`<br>`reorder`: admin (before `try`) · parse id + local `directionSchema` · FEATURED_WORK `max` (only if order changed)<br>`get-admin-featured-work-by-id`: admin (before `try`) · parse id · —<br>`get-paginated-admin-featured-works`: admin (before `try`) · `clampPagination` · —<br>`get-public-featured-works`: public · none · cache FEATURED_WORK (in `lib/load-public-featured-works.ts`) | `apps/web/src/entities/featured-work/model/query-keys.ts` (`featuredWorkKeys`); `query/featured-work-queries.ts` (`featuredWorkQueries`: `adminPage`, `adminById`); hook `useAdminFeaturedWorkById` | `apps/web/src/entities/featured-work/ui/`; admin `apps/web/src/widgets/dashboard/featured-work-manager/ui/`; public `apps/web/src/features/public/homepage-featured-works/ui/` |

### Root barrel

- `apps/web/src/entities/index.ts` re-exports 12 slices. `featured-work` and `workspace-settings` are missing.
- AGENTS §3: never import the `@/entities` root barrel from a client component; import `@/entities/<slice>`.
- Nothing imports the root barrel today (`rg "['\"]@/entities['\"]" apps/web/src` returns 0 matches).

### CACHE_TAGS

`apps/web/src/shared/lib/constants.ts:1-29`. 14 keys. Revalidation sites found with `rg "revalidateTag" apps/web/src`.

| Value | Key | Revalidated by |
| --- | --- | --- |
| `blog` | `BLOG` | blog: create, update, delete; project: update, delete; tag: create, update, delete; media delete |
| `company` | `COMPANY` | company: create, update, delete; media delete |
| `contact-message` | `CONTACT` | contact-message: send, delete |
| `education` | `EDUCATION` | education: create, update, delete; media delete |
| `featured-work` | `FEATURED_WORK` | featured-work: create, update, delete, reorder; media delete |
| `media` | `MEDIA` | media: upload, finalize video, delete |
| `project` | `PROJECT` | project: create, update, delete; tag: create, update, delete; tech-stack: create, update, delete; media delete |
| `social-link` | `SOCIAL` | user-profile: save-profile (social-link itself never revalidates) |
| `tag` | `TAG` | tag: create, update, delete |
| `tech-stack` | `TECH` | tech-stack: create, update, delete; media delete |
| `user-profile` | `USER` | user-profile: save-profile; media delete |
| `comment` | `COMMENT` | comment: post, hide, set visibility |
| `open-source` | `OPEN_SOURCE` | none: time-based only (`constants.ts:14-15`) |
| `workspace-settings` | `WORKSPACE_SETTINGS` | workspace-settings: update |

- "media delete" = `apps/web/src/entities/media/api/delete-media.ts:54-65`, which loops over BLOG, COMPANY, EDUCATION, FEATURED_WORK, PROJECT, TECH, USER.
- The per-post tag `blog.slug` is not a key. It is revalidated by `apps/web/src/entities/blog/api/toggle-blog-interaction.ts:84`.

## Key flows

- Public blog list: `apps/web/src/app/[locale]/(public)/blogs/page.tsx:48` prefetches `blogQueries.publicList(1, DEFAULT_BLOG_FILTERS)`, and the client reads the same factory through `usePublicBlogList` (`apps/web/src/widgets/public/blogs-content/ui/blogs-content.tsx:40`). The factory unwraps the envelope, so a refused read throws and nothing is hydrated. `get-paginated-public-blogs.ts` is cached by page, limit, search, tags and locale; drafts bypass the cache and have their own key.
- Public post: `apps/web/src/app/[locale]/(public)/blogs/[slug]/page.tsx:32` → `get-public-blog-by-slug.ts` (tags `blog` + slug); prev/next and related are separate cached reads.
- Editors load the full row by id on open (`get-admin-*-by-id`), never the list row: `apps/web/src/widgets/dashboard/company-manager/ui/company-manager.tsx:73`; blog at `blog-manager.tsx:69`.
- Dashboard lists are prefetched with `*Keys.adminPage` into `HydrationBoundary`: `apps/web/src/app/[locale]/(protected)/dashboard/{blogs,companies,educations,featured-works}/page.tsx`.
- Save: `apps/web/src/shared/hooks/use-crud-manager.ts` invalidates `keys.all` (`:133`) and removes the detail key (`:139-141`) in `onSuccess`.
- Homepage featured works: `apps/web/src/features/public/homepage-featured-works/ui/homepage-featured-works.tsx:8` → `get-public-featured-works.ts` → `lib/load-public-featured-works.ts` (DB rows with their links, position order, six at most) → `lib/get-featured-work-github.ts` (GitHub facts per pull-request link: repo, stars, title, state; 1 h; failure returns `{}` and each link keeps its repo and number from its url).
- Blog body images: `getPublicBlogBySlug` reads each body image's stored size from its media row (`apps/web/src/entities/blog/lib/read-image-sizes.ts`), cached with the post under the `image-sizes` key.
- Homepage media: each clip's box takes the stored size (`media.width`/`height`, from `load-public-featured-works.ts`) before the file is fetched, and the file's own metadata only corrects it. Each clip's file is requested only once it is within 200 px of the screen (`apps/web/src/entities/featured-work/ui/featured-work-demo.tsx`, `NEAR`), then kept. A clip and an image sit under a pulsing cover until their file draws, and the cover fades out in place (`MediaCover`, `shared/ui/media-cover.tsx`). Full screen (`featured-work-demo.tsx`) takes the clip's stage with sound on, through the browser's element API where it exists. Where the browser refuses it or has none (iPhone Safari), the same stage is pinned to the viewport instead. A toolbar zooms 1×–4× (steps, pinch, one-finger pan; `use-demo-zoom.ts`), and the zoom resets on leaving.
- Education: `apps/web/src/features/public/homepage-education/ui/homepage-education.tsx:12` (`getAllPublicEducations`).

## Recipes

1. **New admin action** (model: `apps/web/src/entities/education/api/delete-education.ts`)
   1. Add `api/<verb>-<slice>.ts` with `'use server';` as the first line.
   2. Inside `try`: `await requireAdmin()`, then `parseInput(idSchema, id)` (`delete-education.ts:16-22`).
   3. Scope the Prisma `where` by `userId` (`:24-26`).
   4. After the write, and after any `$transaction` closes, call `revalidateTag(CACHE_TAGS.X, 'max')` (`update-education.ts:141-143`).
   5. Return `ApiResponse<T>`; failures set `errorMsg`.
   6. Export it from `api/index.ts`, then call it from `apps/web/src/widgets/dashboard/<slice>-manager/ui/`.
2. **New cached public read** (model: `apps/web/src/entities/blog/api/get-related-public-blogs.ts:102-111`)
   1. Wrap the handler: `handlePublicAction(name, …)` around `withPublicActionHandler(name, handler, { cache: true, cacheKey, cacheTags })` (`apps/web/src/shared/api/public-action-template.ts`).
   2. `cacheKey` lists every argument the query reads (`get-related-public-blogs.ts:104-109`). The locale is appended by the template (`public-action-template.ts:50`).
   3. Filter translations with `where: { language: { in: getTranslationLanguages(locale) } }` and a narrow `select` (`get-all-public-educations.ts:35`).
   4. Tag with `CACHE_TAGS.X` so the entity's mutations revalidate it.
3. **New column on an entity** (model: featured-work)
   1. `apps/web/src/entities/featured-work/model/featured-work-schema.ts:48` (`featuredWorkSchema`) and `model/types.ts`.
   2. Write path: `api/create-featured-work.ts` (`prisma.featuredWork.create`), `api/update-featured-work.ts` (`tx.featuredWork.update`, then the link and media rows).
   3. Read path: `api/get-admin-featured-work-by-id.ts`; public `select` in `lib/load-public-featured-works.ts` (`getPublicFeaturedWorkRows`), mapping in `toRows` (`:86`).
   4. If the cached public row changes shape, bump `featured-works-rows-v7` in `lib/load-public-featured-works.ts` (precedent: commit `56fc32bd`). The GitHub half is `featured-works-github-v2` in `lib/get-featured-work-github.ts`.
   5. UI: `apps/web/src/widgets/dashboard/featured-work-manager/ui/featured-work-form.tsx`, `apps/web/src/entities/featured-work/ui/featured-work-row.tsx`.

## Gotchas

- `requireAdmin()` throws `Error('Unauthorized')` (`apps/web/src/shared/lib/auth/session.ts:65`). Inside `try` it becomes `errorMsg: 'Unauthorized'`; before `try` it escapes as a thrown error.
- Blog update and delete scope their write by `userId` (`update-blog.ts:37`, `delete-blog.ts:22-25`). Company, education and featured-work updates first run `findFirst({ where: { id, userId } })`. Latent only: `getAuthenticatedAdmin()` admits just the site owner (`apps/web/src/shared/lib/auth/session.ts:43-62`).
- Revalidate only after commit: `update-company.ts:155-157`, `update-education.ts:141-143`, `update-featured-work.ts:97-99`, `reorder-featured-work.ts:91-93`.
- Public cache keys are string literals, not factories: `featured-works-rows-v7` (`load-public-featured-works.ts`) and `featured-works-github-v2` (`get-featured-work-github.ts`). Bump the version when the cached shape changes. v7 is the move from one `url` to `links`.
- Per the comment at `get-adjacent-public-blogs.ts:26-28`, a cache hit returns `Date` fields as strings; callers accept `Date | string`.
- Education `api/index.ts` exports only the public read; company has no `api/index.ts`. Admin actions are imported by deep path (see deviations).
- Two blog modules are off the barrel on purpose (`apps/web/src/entities/blog/api/index.ts:1-6`). Import them by path: `apps/web/src/app/sitemap.ts:5`, `apps/web/src/app/feed.xml/route.ts:1`.

## Run

```bash
bun run --filter 'web' check-types   # tsc --noEmit (apps/web/package.json:10)
bun run --filter 'web' lint          # eslint . (apps/web/package.json:16)
bun run --filter 'web' test          # bun test (apps/web/package.json:18)
cd apps/web && bun test src/entities/featured-work   # one slice, bun path filter
```

## AGENTS.md deviations

- `apps/web/src/entities/blog/api/create-blog.ts:21`, `update-blog.ts:20`, `delete-blog.ts:13`, `get-admin-blog-by-id.ts:22`: `requireAdmin()` before `try`. AGENTS §8 says every action returns `ApiResponse<T>`.
- `apps/web/src/entities/blog/api/get-admin-blog-by-id.ts:36`: `translations: true`, which §8 forbids. Intentional: the editor edits every locale's `content` (comment at `:32-33`).
- `apps/web/src/entities/blog/api/get-public-feed-blogs.ts:1`, `get-published-blogs.ts:1`: no `'use server'`, raw return. AGENTS §8 says everything under `api/` is a server action. Intentional, explained in each file.
- `apps/web/src/entities/blog/api/get-public-blog-by-slug.ts:18`: manual `if (!slug)` instead of `parseInput` (§8 step 2).
- `apps/web/src/entities/blog/api/get-adjacent-public-blogs.ts:25`: `currentId` is never validated (§8 step 2).
- `apps/web/src/entities/featured-work/api/reorder-featured-work.ts:14`: `directionSchema` is declared outside `model/featured-work-schema.ts` (§8).
- `apps/web/src/entities/blog/model/types.ts:3`, `apps/web/src/entities/blog/api/get-paginated-public-blogs.ts:7`: import `@/entities/project/model/types`, another slice's internals (§3 "never sideways").
- `apps/web/src/entities/featured-work/lib/featured-work-media.ts:4`, `lib/load-public-featured-works.ts:19`, `ui/featured-work-row.tsx:10`: import `@/entities/media/model/upload-constraints` (§3).
- 73 import lines in 40 files outside these slices reach `api/`, `model/`, `ui/` or `lib/` directly instead of the slice barrel (§3). Example: `apps/web/src/widgets/dashboard/company-manager/ui/company-manager.tsx:15-18`.

## See also

- [Web app routes](web-app-routes.md): the pages that call these actions.
- [Web entities: supporting](web-entities-supporting.md): media, tag, project, comment, the other `CACHE_TAGS` producers.
- [Web features](web-features.md): public blog and featured-work features.
- [Web widgets](web-widgets.md): the dashboard managers.
- [Web shared](web-shared.md): `public-action-template`, `use-crud-manager`, `validate-action-input`.
- [Architecture](../architecture.md)
