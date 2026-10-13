# Web entities: supporting slices

> Ten entities, `comment` through `workspace-settings`, plus the root admin-keys spec. Source: `apps/web/src/entities/{comment,contact-message,media,open-source,project,social-link,tag,tech-stack,user-profile,workspace-settings}`, `apps/web/src/entities/admin-query-keys.spec.tsx`.

## Layout

```text
apps/web/src/entities/
├── comment/            api/ 5 actions · model/ types, schema, query-keys · query/ factories + 4 hooks · ui/ thread
├── contact-message/    api/ send, admin list, delete · model/ types, schema, query-keys · query/ factory + hook · no ui/
├── media/              api/ upload, video, delete, list · model/ constraints, schemas, file key, query-keys
│                       query/ factories + 6 hooks · ui/ media-card
├── open-source/        api/ GitHub read · lib/ fetch + group · model/ types, ledger (filter, page, month groups) · ui/ repo rows
├── project/            api/ CRUD + admin/public reads + by-id · model/ types, 2 schemas, query-keys · query/ factories + 3 hooks · ui/
├── social-link/        api/ one public read · model/ types only
├── tag/                api/ CRUD + reads + by-id · model/ types, schema, query-keys · query/ factories + 3 hooks · ui/ badge
├── tech-stack/         api/ CRUD + reads + by-id · model/ types, schema, query-keys · query/ factories + 3 hooks · ui/ 2 components
├── user-profile/       api/ save + reads · model/ types, schema, query-keys · query/ `useUserProfile` · ui/ greeting, quote
├── workspace-settings/ api/ read, patch, compression · model/ settings schema, query keys · query/ factory + 2 hooks
└── admin-query-keys.spec.tsx   root spec (see bullet below)
```

- No `'use server'` under `api/`: `apps/web/src/entities/media/api/upload-single-media.ts` and `apps/web/src/entities/media/api/upload-video-direct.ts` (client code), `apps/web/src/entities/workspace-settings/api/get-workspace-settings.ts` (React `cache()` helper).
- 27 spec files in the slice. `open-source` and `social-link` have no query keys.
- No entity lacks server actions. `open-source` (one GitHub read) and `social-link` (one read) have no write action; social links are written by `apps/web/src/entities/user-profile/api/save-profile.ts`.
- `admin-query-keys.spec.tsx` asserts that `adminList()` invalidation stales every page and picker key (blog, education, company, project, tag) but no outside key, and that a server-prefetched first page hydrates with no client fetch.

Table paths are relative to `apps/web/src/entities/<entity>/` (`api/`, `model/`, `ui/`, `query/`) or to `apps/web/src/` (`features/`, `widgets/`, `app/`).

Legend: A `requireAdmin()` · U `requireUser()` · — none (public) · P `parseInput(schema)` · C `clampPagination` · R `revalidateTag(CACHE_TAGS.X, profile)`.

| Entity | Model types (`model/`) | Server action files (`api/`) | Per action: guard · validate · revalidate | Query keys (`model/query-keys.ts`) | Main UI |
|---|---|---|---|---|---|
| comment | `types.ts`; schema `comment-schema.ts` | `get-paginated-admin-comments.ts`<br>`get-paginated-public-comments-for-blog.ts`<br>`post-comment.ts`<br>`hide-comment.ts`<br>`set-comment-visibility.ts` | `getPaginatedAdminComments`: A · C · —<br>`getPaginatedPublicCommentsForBlog`: — · P · no cache<br>`postComment`: U · P (schema inline) · R COMMENT `max`; 5 per min per user<br>`hideComment`: U, then the author or the site owner (`getAuthenticatedAdmin`) · P (one `updateMany` on the `where` the caller may write; `forbidden` when the comment exists and nothing matched, else `not-found`) · R COMMENT `max`<br>`setCommentVisibility`: A · P (`hidden` parsed with `z.boolean()`) · R COMMENT `max` | `commentKeys` (`model/query-keys.ts`) | `ui/` · `query/comment-queries.ts` (`commentQueries.threadInfinite`, `adminPage`) with hooks `use-comment-infinite-query.ts`, `use-post-comment.ts`, `use-admin-comments.ts`, `use-set-comment-visibility.ts`; used by `features/public/blog-comment` and `widgets/dashboard/comment-manager` |
| contact-message | `types.ts`; schema `contact-message-schema.ts` | `send-contact-message.ts`<br>`get-paginated-contacts.ts`<br>`delete-contact-message.ts` | `sendContactMessage`: — · P · R CONTACT `max`; 3 per 10 min per IP<br>`getPaginatedContactMessages`: A · C (`filter.search` not parsed) · —<br>`deleteContactMessage`: A (before `try`) · P (id) · R CONTACT `max`; the delete is scoped to the owner | `contactMessageKeys.list` | `query/` (`contactMessageQueries.list`, `useContactMessages`); `features/public/contact-me/ui/form/contact-form.tsx`, `widgets/dashboard/contact-message-gallery` |
| media | none; `upload-constraints.ts` holds `MediaScope` and MIME types; `Media` is `shared/types/models/media.ts`. Schema `media-schema.ts` | `upload-media.ts`<br>`prepare-video-upload.ts`<br>`finalize-video-upload.ts`<br>`delete-media.ts`<br>`get-paginated-media.ts`<br>(not actions: `upload-single-media.ts`, `upload-video-direct.ts`) | `uploadMedia`: A · P (scope) + `findUploadViolation`, and any video is refused before both · R MEDIA `max`<br>`prepareVideoUpload`: A · P · — (signed PUT URL)<br>`finalizeVideoUpload`: A · P · R MEDIA `max`<br>`deleteMedia`: A · P · R MEDIA `max`, then BLOG, COMPANY, EDUCATION, FEATURED_WORK, PROJECT, TECH, USER (all `max`)<br>`getPaginatedMedia`: A · C · — | `mediaKeys` | `ui/media-card.tsx` · `query/` (`mediaQueries` factories, 6 hooks: `useMediaLibrary`, `useMediaUpload`, `useVideoUpload`, `useMediaInfiniteQuery`, `useScopedImageUploader`, `useMediaRecordUpload`); `features/dashboard/media-library`, `widgets/dashboard/media-manager` |
| open-source | `types.ts` (`OpenSourceRepo`, `OpenSourcePullRequest`, `GithubPullRequestNode`); no schema | `get-open-source-contributions.ts` (reads GitHub through `lib/fetch-merged-pull-requests.ts`) | `getOpenSourceContributions`: — · none (no input) · no write; cache 3600 s, tag OPEN_SOURCE | none (no client query) | `ui/` (repo-summary, repo-link-row, diffstat); `features/public/homepage-open-source`; `features/public/projects-open-source` uses `model/ledger.ts` |
| project | `types.ts`; schemas `project-schema.ts`, `public-project-schema.ts`; `admin-project-include.ts` (the owner's row shape, shared by the list and the by-id read); `admin-project-title.ts` (`adminProjectTitle`, the title for a locale); `PublicProjectFilters`; `ProjectOption` in `api/get-admin-project-options.ts` | `create-project.ts`<br>`update-project.ts`<br>`delete-project.ts`<br>`get-admin-project-by-id.ts`<br>`get-admin-project-options.ts`<br>`get-paginated-admin-projects.ts`<br>`get-paginated-public-projects.ts`<br>`get-public-project-by-id.ts` | `createProject`: A (before `try`) · P · R PROJECT `max`<br>`updateProject`: A (before `try`) · P (id, body) · R PROJECT + BLOG `max` after `$transaction`<br>`deleteProject`: A (before `try`) · P · R PROJECT + BLOG `max`<br>`getAdminProjectById`: A (before `try`) · P (id), `findFirst` scoped to the owner · —<br>`getAdminProjectOptions`: A (before `try`) · — · —<br>`getPaginatedAdminProjects`: A (before `try`) · C · —<br>`getPaginatedPublicProjects`: — · P + C · cache, tag PROJECT<br>`getPublicProjectById`: — · none · cache, tags PROJECT + id | `projectKeys` (`detail(id)` sits under `all`, so a save's root invalidation reaches it; the manager removes it) | `ui/` (editor card, timeline item, empty, timeline skeleton); `query/` (`projectQueries`: `publicList`, `options`, `adminPage`, `adminById`; hooks `usePublicProjectList`, `useProjectReferenceOptions`, `useAdminProjectById`); `widgets/dashboard/project-manager`, `widgets/public/projects-content`, `features/public/project-filters` |
| social-link | `types.ts` (`PublicSocialLink`); no schema | `get-all-public-contacts.ts` (only action, a read) | `getAllPublicContacts`: — · none · cache, tag SOCIAL. Writes live in `apps/web/src/entities/user-profile/api/save-profile.ts` (R SOCIAL `max`) | none | none in entity; `features/public/contact-infos` |
| tag | `types.ts`; schema `tag-schema.ts`; `admin-tag-include.ts`; `tag-display-name.ts` (`tagDisplayName`); `revalidation.ts` (`TAG_MUTATION_TAGS`: TAG, BLOG and PROJECT); `TagOption` in `api/get-admin-tag-options.ts` | `create-tag.ts`<br>`update-tag.ts`<br>`delete-tag.ts`<br>`get-admin-tag-by-id.ts`<br>`get-admin-tag-options.ts`<br>`get-paginated-admin-tags.ts`<br>`get-paginated-public-tags.ts` | `createTag`: A · P · R TAG + BLOG + PROJECT `max`<br>`updateTag`: A · P (id, body) · R TAG + BLOG + PROJECT `max`<br>`deleteTag`: A · P · R TAG + BLOG + PROJECT `max`<br>`getAdminTagById`: A · P (id) · —<br>`getAdminTagOptions`: A · — · —<br>`getPaginatedAdminTags`: A · C · —<br>`getPaginatedPublicTags`: — · C · cache, tag TAG | `tagKeys` (`detail(id)` sits under `all`, outside `adminList`; the manager drops it on save) | `ui/tag-clickable-badge.tsx` · `query/` (`tagQueries`: `options`, `infinite`, `adminPage`, `adminById`; hooks `useTagOptions`, `useTagInfiniteQuery`, `useAdminTagById`); `widgets/dashboard/tag-manager`, `features/public/blog-filters`, `features/public/project-filters` |
| tech-stack | `types.ts`; schema `tech-stack-schema.ts`; `revalidation.ts` (`TECH_MUTATION_TAGS`: TECH and PROJECT) | `create-tech-stack.ts` (exports `addTechStack`)<br>`update-tech-stack.ts`<br>`delete-tech-stack.ts`<br>`get-admin-tech-stack-by-id.ts`<br>`get-all-admin-tech-stacks.ts` (exports `getAllAdminTechStack`)<br>`get-all-public-tech-stacks.ts`<br>`get-paginated-public-tech-stacks.ts` | `addTechStack`: A · P · R TECH + PROJECT `max`<br>`updateTechStack`: A · P (id, body) · R TECH + PROJECT `max`<br>`deleteTechStack`: A · P · R TECH + PROJECT `max`<br>`getAdminTechStackById`: A · P (id) · —<br>`getAllAdminTechStack`: A · — · `take` `ADMIN_OPTIONS_LIMIT` (the manager's list and the picker share it)<br>`getAllPublicTechStacks`: — · none · cache, tag TECH<br>`getPaginatedPublicTechStacks`: — · C · cache, tag TECH | `techStackKeys` (`options()` is nested under `list()`, so every write reaches it; `detail(id)` sits outside) | `ui/` (badge, clickable badge); `query/` (`techStackQueries`: `options`, `infinite`, `adminById`; hooks `useTechStackOptions`, `useTechStackInfiniteQuery`, `useAdminTechStackById`); `widgets/dashboard/tech-stack-manager`, `features/public/homepage-tech-stack`, `features/public/project-filters` |
| user-profile | `types.ts`; schema `user-profile-schema.ts` | `save-profile.ts`<br>`get-user-profile-with-translations.ts`<br>`get-user-profile.ts`<br>`get-public-user-profile.ts` | `saveProfile`: A · P · R USER `max` and SOCIAL `max` after `$transaction`<br>`getAdminUserProfile`: A · — · —<br>`getUserProfile`: A · — · —<br>`getPublicUserProfile`: — · none · cache, tag USER | `userProfileKeys.profile`; `query/user-profile-queries.ts` (`userProfileQueries.profile`) | `ui/` (greeting, profile quote); `features/dashboard/update-profile`, `widgets/dashboard/user-profile-manager`, `features/public/homepage-profile` |
| workspace-settings | none; `WorkspaceSettings` is `z.infer` in `settings-schema.ts`. Schema `settings-schema.ts` | `update-workspace-settings.ts`<br>`get-admin-workspace-settings.ts`<br>`get-image-compression-settings.ts`<br>`get-workspace-settings.ts` (helper, no `'use server'`) | `updateWorkspaceSettings`: A · P (patch) · R WORKSPACE_SETTINGS `max`<br>`getAdminWorkspaceSettings`: A · — · cache, tag WORKSPACE_SETTINGS (via `readWorkspaceSettings`)<br>`getImageCompressionSettings`: A · — · —, returns the envelope<br>`getWorkspaceSettings`: A inside `cache()`, throws on refusal · — · cache, tag WORKSPACE_SETTINGS | `workspaceSettingsKeys.current()` | `query/` (`workspaceSettingsQueries.current()`, `useWorkspaceSettings`, `useUpdateImageCompression`); `features/dashboard/media-library`, `app/[locale]/(protected)/dashboard/layout.tsx` |

## Key flows

- Admin CRUD: `apps/web/src/widgets/dashboard/tag-manager/ui/tag-manager.tsx:56` (`useCrudManager`) → `apps/web/src/entities/tag/api/*.ts` (A → P → Prisma → R) → managers pass `keys` (`<x>Keys.all`, `<x>Keys.detail`); a save invalidates `all` and drops `detail(id)`.
- Public cached read: `apps/web/src/entities/<x>/api/get-*.ts` → `handlePublicAction` → `withPublicActionHandler` (`apps/web/src/shared/api/public-action-template.ts:34-68`) → `unstable_cache` keyed by `cacheTags`; the write action's `revalidateTag` clears it.
- Blog comments: `apps/web/src/features/public/blog-comment/ui/blog-comment-section.tsx:54` → `usePostComment` (`apps/web/src/entities/comment/query/use-post-comment.ts`, a `useServerMutation`) → `postComment` (requireUser, 5 per min per user, mail in `after()`); the thread is read by `useCommentInfiniteQuery` (`apps/web/src/entities/comment/query/use-comment-infinite-query.ts`), uncached.
- Blog interaction counts (like, clap): the count and the reader's own state are read through `useBlogInteractionState` (`apps/web/src/entities/blog/query/use-blog-interaction-state.ts`, over `blogQueries.interaction` in `blog-queries.ts`) and `apps/web/src/entities/blog/api/get-blog-interactions-for-user.ts`. The toggle is `apps/web/src/entities/blog/api/toggle-blog-interaction.ts`. Both are blog-entity actions, not feature code.
- Image upload: each form calls `useScopedImageUploader(scope)` (`apps/web/src/entities/media/query/use-image-upload.ts`; `project-form.tsx` is one caller) → `apps/web/src/entities/media/api/upload-single-media.ts` compresses in the browser (settings memo 30 s) → images: `uploadMedia` compresses again on the server (`apps/web/src/entities/media/api/upload-media.ts:115`); video: `uploadVideoDirect` (prepare → PUT to signed URL → finalize).
- Settings: `apps/web/src/app/[locale]/(protected)/dashboard/layout.tsx` prefetches `workspaceSettingsQueries.current()` into a `HydrationBoundary`; `useWorkspaceSettings()` reads it. A write goes through `useUpdateImageCompression` → `updateWorkspaceSettings`, which merges jsonb in SQL, revalidates WORKSPACE_SETTINGS, and returns the row, which the hook puts back into the query.
- Profile: `apps/web/src/features/dashboard/update-profile/lib/use-profile-controller.tsx:59` (`useServerMutation`) → `saveProfile` (one `$transaction` for profile, translations, social links) → R USER and SOCIAL after commit.
- Contact form: `apps/web/src/features/public/contact-me/ui/form/contact-form.tsx:64` → `sendContactMessage` (3 per 10 min per IP, mail in `after()`, R CONTACT, which `apps/web/src/features/dashboard/dashboard-stats/lib/get-dashboard-stats.ts` reads).
- Open source: `getOpenSourceContributions` → GitHub GraphQL (`apps/web/src/entities/open-source/lib/fetch-merged-pull-requests.ts:3`) → `groupByRepo` → cached 3600 s under OPEN_SOURCE; no write invalidates it.

## Recipes

1. Add an admin action to a CRUD entity (example: tag)
   1. Schema: `apps/web/src/entities/tag/model/tag-schema.ts`.
   2. Action: `apps/web/src/entities/tag/api/create-tag.ts` pattern. `'use server'`, `requireAdmin()` before `try`, `parseInput` inside `try`, Prisma, `revalidateTag(CACHE_TAGS.X, 'max')` after the write (the tag actions loop over `TAG_MUTATION_TAGS`, which also covers BLOG and PROJECT: `apps/web/src/entities/tag/model/revalidation.ts`), `ApiResponse` with `errorMsg`.
   3. Export it from `apps/web/src/entities/tag/api/index.ts`, unless it is a picker (see gotchas).
   4. Manager: `useCrudManager` in `apps/web/src/widgets/dashboard/tag-manager/ui/tag-manager.tsx:56`; pass `keys: { all: tagKeys.all, detail: tagKeys.detail }` from `apps/web/src/entities/tag/model/query-keys.ts`. A save invalidates `all` and drops the `detail(id)` record the dialog loads (`useAdminTagById`), so the pre-save record is not left cached.
2. Add a cached public read (example: projects)
   1. Params schema: `apps/web/src/entities/project/model/public-project-schema.ts`; call `parseInput` first.
   2. Wrap with `handlePublicAction` and `withPublicActionHandler(..., { cache: true, cacheKey: [every closure arg], cacheTags: [CACHE_TAGS.X] })`. Pattern: `apps/web/src/entities/project/api/get-paginated-public-projects.ts:174-189`.
   3. Client and server prefetch call the same factory: `apps/web/src/app/[locale]/(public)/projects/page.tsx:44` (`projectQueries.publicList`) and `apps/web/src/entities/project/query/use-public-project-list.ts` (the client hook spreads the same options).
3. Add a workspace setting (no migration: `preferences` is `Json @default("{}")`, `packages/db/prisma/schema.prisma:871`)
   1. Add the field to `workspaceSettingsSchema` and to `WORKSPACE_SETTINGS_DEFAULTS` in `apps/web/src/entities/workspace-settings/model/settings-schema.ts` (lines 26-50). The patch schema is `.partial()` (lines 94-98), so the action needs no change.
   2. Prefetch `workspaceSettingsQueries.current()` in the dashboard layout; read it on the client with `useWorkspaceSettings()` (`apps/web/src/entities/workspace-settings/query/use-workspace-settings.ts`).
   3. Write with `updateWorkspaceSettings({ field: value })` (`apps/web/src/entities/workspace-settings/api/update-workspace-settings.ts:34`).

## Gotchas

- `withPublicActionHandler` appends the locale to `cacheKey` and nothing else; page, ids and filters must be in the key yourself (`apps/web/src/shared/api/public-action-template.ts:50`).
- No `CACHE_TAGS.COMMENT` or `CACHE_TAGS.MEDIA` read exists in `apps/web/src`, so their `revalidateTag` calls invalidate nothing today.
- Every `revalidateTag` call in `apps/web/src` passes `'max'`; none passes `'default'`.
- `hideComment` lets the author hide their own comment and the site owner hide any (`apps/web/src/entities/comment/api/hide-comment.ts:29-42`). The admin test is `getAuthenticatedAdmin()`, which checks role and owner identity, not `user.role` alone. An anonymous caller rejects at `requireUser()` (`hide-comment.ts:21`, outside the `try`). A signed-in user who is neither gets `errorCode: 'forbidden'` on someone else's comment and `not-found` on a missing one, with no write. `apps/web/src/entities/comment/api/hide-comment.spec.ts` pins the cases. Only the admin `setCommentVisibility` can unhide.
- `apps/web/src/entities/project/api/index.ts` and `apps/web/src/entities/tag/api/index.ts` omit the picker actions, so the query factories import them by path (`apps/web/src/entities/project/query/project-queries.ts`, `apps/web/src/entities/tag/query/tag-queries.ts`). `apps/web/src/entities/workspace-settings/api/index.ts:1-6` and `apps/web/src/entities/user-profile/api/index.ts:1-7` omit their helpers on purpose.
- `getWorkspaceSettings` fails closed: a signed-out caller gets the `requireAdmin()` refusal, not defaults (`apps/web/src/entities/workspace-settings/api/get-workspace-settings.ts:94-100`). A failed read in `useWorkspaceSettings()` throws to the error boundary; it never renders defaults.
- `deleteMedia` deletes the row first (`apps/web/src/entities/media/api/delete-media.ts:36`). The storage object follows, best effort (`:44`); a failed storage delete is logged (`:47`) and leaves an orphan object. A failed row delete keeps the file.
- `projectKeys.publicList` and `tagKeys.infinite` have no locale segment, but their actions resolve titles by locale (`apps/web/src/entities/project/api/get-paginated-public-projects.ts:88`, `apps/web/src/entities/tag/api/get-paginated-public-tags.ts:31`). `tagKeys.options` includes one for this reason.
- The three picker hooks name their retry differently: `useTagOptions` and `useProjectReferenceOptions` return `retry`; `useTechStackOptions` returns `refetch`, which `apps/web/src/widgets/dashboard/company-manager/ui/company-form.tsx` reads. Rename the hook and its reader together.
- `getAllAdminTechStack` is capped at `ADMIN_OPTIONS_LIMIT` (500) for the picker and the manager alike; rows past the cap are dropped without a message.

## Run

```bash
bun run check                            # repo gate: root "check" -> scripts/check.sh
cd apps/web && bun test src/entities     # all entity specs, including this slice's 27 and the root admin-keys spec
cd apps/web && bun run check-types       # tsc --noEmit
cd apps/web && bun run lint              # eslint .
```

## AGENTS.md deviations

- `apps/web/src/entities/comment/api/post-comment.ts:26` — §8: schema defined inline; it belongs in `apps/web/src/entities/comment/model/comment-schema.ts`.
- `apps/web/src/entities/project/api/get-public-project-by-id.ts:15` — §8: `id` is never parsed (no `parseInput(idSchema)`).
- `apps/web/src/entities/contact-message/api/get-paginated-contacts.ts:15-17` — §8: `filter.search` goes to Prisma unparsed.
- `apps/web/src/entities/media/api/upload-single-media.ts:1`, `apps/web/src/entities/media/api/upload-video-direct.ts:1` — §8: client code under `api/` without `'use server'`.
- `apps/web/src/entities/workspace-settings/api/get-workspace-settings.ts:1` — §8: not a server action; intentional per its comment, still outside the letter of the rule.
- `apps/web/src/entities/user-profile/api/get-public-user-profile.ts:22-33` — §8: translations read with no `language: { in: … }` filter.
- `apps/web/src/entities/user-profile/api/get-public-user-profile.ts:18-20`, `apps/web/src/entities/project/api/get-paginated-public-projects.ts:59-60` — §8: closure-captured `userId` is absent from `cacheKey`. It is an env constant, so harmless today.
- `apps/web/src/entities/media/api/upload-single-media.ts:12` — §3: deep cross-slice import; the barrel exports it.
- `apps/web/src/entities/media/api/upload-media.ts:20` — §3: deep import of `getWorkspaceSettings`, which the barrel omits on purpose (`apps/web/src/entities/workspace-settings/api/index.ts:1-6`).
- `apps/web/src/entities/project/ui/project-timeline-item.tsx:11-12` — §3: deep cross-slice UI imports from the tag and tech-stack `ui/` folders.
- `apps/web/src/entities/social-link/api/get-all-public-contacts.ts:27`, `apps/web/src/entities/open-source/api/get-open-source-contributions.ts:49`, `apps/web/src/entities/tech-stack/api/get-all-public-tech-stacks.ts:41`, `apps/web/src/entities/tech-stack/api/get-paginated-public-tech-stacks.ts:47`, `apps/web/src/entities/tag/api/get-paginated-public-tags.ts:64` — §6: `CACHE_TAGS` used as an unstable_cache `cacheKey`; the rule says it is only for `revalidateTag`.
- `apps/web/src/entities/open-source/lib/fetch-merged-pull-requests.ts:3` — §11.7: hardcoded endpoint URL (the public GitHub GraphQL API).
- `apps/web/src/entities/workspace-settings/model/settings-schema.ts`, `apps/web/src/entities/project/model/public-project-schema.ts` — §8: schema file names are not `<slice>-schema.ts`.
- §11.14: 111 comment blocks over three lines, spec files included (media 40, workspace-settings 19, project 13, comment 12, tag 7, tech-stack 5, user-profile 6, open-source 6, contact-message 3). Largest: `apps/web/src/entities/workspace-settings/api/get-workspace-settings.ts:61-93` (33 lines).

## See also

- [web-entities-content.md](web-entities-content.md): blog, company, education, featured-work, the other entities.
- [web-features.md](web-features.md): the features that call these actions.
- [web-widgets.md](web-widgets.md): the manager widgets that consume the CRUD actions.
- [web-shared.md](web-shared.md): `apps/web/src/shared/api` public handler, auth, `validate-action-input`, `constants`.
- [packages-db.md](packages-db.md): the Prisma models behind these reads and writes.
- [../architecture.md](../architecture.md)
