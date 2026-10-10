# Web entities: supporting slices

> Ten entities, `comment` through `workspace-settings`, plus the root admin-keys spec. Source: `apps/web/src/entities/{comment,contact-message,media,open-source,project,social-link,tag,tech-stack,user-profile,workspace-settings}`, `apps/web/src/entities/admin-query-keys.spec.tsx`.

## Layout

```text
apps/web/src/entities/
├── comment/            api/ 5 actions · model/ types, schema, query-keys · query/ infinite hook · ui/ thread
├── contact-message/    api/ send + admin list · model/ types, schema, query-keys · no ui/
├── media/              api/ upload, video, delete, list · model/ constraints, schemas, file key, query-keys
│                       query/ 3 hooks · ui/ media-card
├── open-source/        api/ GitHub read · lib/ fetch + group · model/ types · ui/ repo rows
├── project/            api/ CRUD + admin/public reads · model/ types, 2 schemas, query-keys · ui/
├── social-link/        api/ one public read · model/ types only
├── tag/                api/ CRUD + reads · model/ types, schema, query-keys · query/ 2 hooks · ui/ badge
├── tech-stack/         api/ CRUD + reads · model/ types, schema, query-keys · query/ 1 hook · ui/ 3 components
├── user-profile/       api/ save + reads · model/ types, schema, query-keys · ui/ greeting, quote
├── workspace-settings/ api/ read, patch, compression · model/ settings schema, client context
└── admin-query-keys.spec.tsx   root spec (see bullet below)
```

- No `'use server'` under `api/`: `apps/web/src/entities/media/api/upload-single-media.ts` and `apps/web/src/entities/media/api/upload-video-direct.ts` (client code), `apps/web/src/entities/user-profile/api/get-owner-display-name.ts` and `apps/web/src/entities/workspace-settings/api/get-workspace-settings.ts` (React `cache()` helpers).
- 12 spec files in the slice. `open-source`, `social-link` and `workspace-settings` have no query keys.
- No entity lacks server actions. `open-source` (one GitHub read) and `social-link` (one read) have no write action; social links are written by `apps/web/src/entities/user-profile/api/save-profile.ts`.
- `admin-query-keys.spec.tsx` asserts that `adminList()` invalidation stales every page and picker key (blog, education, company, project, tag) but no outside key, and that a server-prefetched first page hydrates with no client fetch.

Table paths are relative to `apps/web/src/entities/<entity>/` (`api/`, `model/`, `ui/`, `query/`) or to `apps/web/src/` (`features/`, `widgets/`, `app/`).

Legend: A `requireAdmin()` · U `requireUser()` · — none (public) · P `parseInput(schema)` · C `clampPagination` · R `revalidateTag(CACHE_TAGS.X, profile)`.

| Entity | Model types (`model/`) | Server action files (`api/`) | Per action: guard · validate · revalidate | Query keys (`model/query-keys.ts`) | Main UI |
|---|---|---|---|---|---|
| comment | `types.ts`; schema `comment-schema.ts` | `get-paginated-admin-comments.ts`<br>`get-paginated-public-comments-for-blog.ts`<br>`post-comment.ts`<br>`hide-comment.ts`<br>`set-comment-visibility.ts` | `getPaginatedAdminComments`: A · C · —<br>`getPaginatedPublicCommentsForBlog`: — · P · no cache<br>`postComment`: U · P (schema inline) · R COMMENT `default`; 5 per min per user<br>`hideComment`: U (`where.userId`) · P · R COMMENT `max`<br>`setCommentVisibility`: A · P (`hidden` not parsed) · R COMMENT `max` | `commentKeys`; `commentKey` is a deprecated alias still used in 2 files | `ui/` · `query/use-comment-infinite-query.ts`; used by `features/public/blog-comment`, `widgets/dashboard/comment-manager` |
| contact-message | `types.ts`; schema `contact-message-schema.ts` | `send-contact-message.ts`<br>`get-paginated-contacts.ts` | `sendContactMessage`: — · P · R CONTACT `max`; 3 per 10 min per IP<br>`getPaginatedContactMessages`: A · C (`filter.search` not parsed) · — | `contactMessageKeys.list` | none in entity; `features/public/contact-me/ui/form/contact-form.tsx`, `widgets/dashboard/contact-message-gallery` |
| media | none; `upload-constraints.ts` holds `MediaScope` and MIME types; `Media` is `shared/types/models/media.ts`. Schema `media-schema.ts` | `upload-media.ts`<br>`prepare-video-upload.ts`<br>`finalize-video-upload.ts`<br>`delete-media.ts`<br>`get-paginated-media.ts`<br>(not actions: `upload-single-media.ts`, `upload-video-direct.ts`) | `uploadMedia`: A · P (scope) + `findUploadViolation` · R MEDIA `max`<br>`prepareVideoUpload`: A · P · — (signed PUT URL)<br>`finalizeVideoUpload`: A · P · R MEDIA `max`<br>`deleteMedia`: A · P · R MEDIA `max`, then BLOG, COMPANY, EDUCATION, FEATURED_WORK, PROJECT, TECH, USER (all `max`)<br>`getPaginatedMedia`: A · C · — | `mediaKeys` | `ui/media-card.tsx` · `query/` (3 hooks); `features/dashboard/media-library`, `widgets/dashboard/media-manager` |
| open-source | `types.ts` (`OpenSourceRepo`, `OpenSourcePullRequest`, `GithubPullRequestNode`); no schema | `get-open-source-contributions.ts` (reads GitHub through `lib/fetch-merged-pull-requests.ts`) | `getOpenSourceContributions`: — · none (no input) · no write; cache 3600 s, tag OPEN_SOURCE | none (no client query) | `ui/` (repo-summary, repo-details, repo-link-row, diffstat); `features/public/homepage-open-source` |
| project | `types.ts`; schemas `project-schema.ts`, `public-project-schema.ts`; `ProjectOption` in `api/get-admin-project-options.ts` | `create-project.ts`<br>`update-project.ts`<br>`delete-project.ts`<br>`get-admin-project-options.ts`<br>`get-paginated-admin-projects.ts`<br>`get-paginated-public-projects.ts`<br>`get-public-project-by-id.ts` | `createProject`: A · P · R PROJECT `max`<br>`updateProject`: A · P (id, body) · R PROJECT `max` after `$transaction`<br>`deleteProject`: A · P · R PROJECT `max`<br>`getAdminProjectOptions`: A · — · —<br>`getPaginatedAdminProjects`: A · C · —<br>`getPaginatedPublicProjects`: — · P + C · cache, tag PROJECT<br>`getPublicProjectById`: — · none · cache, tags PROJECT + id | `projectKeys` | `ui/` (editor card, timeline item, empty); `widgets/dashboard/project-manager`, `widgets/public/projects-content` |
| social-link | `types.ts` (`PublicSocialLink`); no schema | `get-all-public-contacts.ts` (only action, a read) | `getAllPublicContacts`: — · none · cache, tag SOCIAL. Writes live in `apps/web/src/entities/user-profile/api/save-profile.ts` (R SOCIAL `max`) | none | none in entity; `features/public/contact-infos` |
| tag | `types.ts`; schema `tag-schema.ts`; `TagOption` in `api/get-admin-tag-options.ts` | `create-tag.ts`<br>`update-tag.ts`<br>`delete-tag.ts`<br>`get-admin-tag-options.ts`<br>`get-paginated-admin-tags.ts`<br>`get-paginated-public-tags.ts` | `createTag`: A · P · R TAG `max`<br>`updateTag`: A · P (id, body) · R TAG `max`<br>`deleteTag`: A · P · R TAG `max`<br>`getAdminTagOptions`: A · — · —<br>`getPaginatedAdminTags`: A · C · —<br>`getPaginatedPublicTags`: — · C · cache, tag TAG | `tagKeys` | `ui/tag-clickable-badge.tsx` · `query/` (2 hooks); `widgets/dashboard/tag-manager`, `features/public/blog-filters` |
| tech-stack | `types.ts`; schema `tech-stack-schema.ts` | `create-tech-stack.ts` (exports `addTechStack`)<br>`update-tech-stack.ts`<br>`delete-tech-stack.ts`<br>`get-all-admin-tech-stacks.ts` (exports `getAllAdminTechStack`)<br>`get-all-public-tech-stacks.ts`<br>`get-paginated-public-tech-stacks.ts` | `addTechStack`: A · P · R TECH `max`<br>`updateTechStack`: A · P (id, body) · R TECH `default`<br>`deleteTechStack`: A · P · R TECH `max`<br>`getAllAdminTechStack`: A · — · —<br>`getAllPublicTechStacks`: — · none · cache, tag TECH<br>`getPaginatedPublicTechStacks`: — · C · cache, tag TECH | `techStackKeys` | `ui/` (badge, card, clickable badge); `query/use-tech-stack-infinite-query.ts`; `widgets/dashboard/tech-stack-manager`, `features/public/homepage-tech-stack` |
| user-profile | `types.ts`; schema `user-profile-schema.ts` | `save-profile.ts`<br>`get-user-profile-with-translations.ts`<br>`get-user-profile.ts`<br>`get-public-user-profile.ts`<br>`get-owner-display-name.ts` (helper, no `'use server'`) | `saveProfile`: A · P · R USER `max` and SOCIAL `max` after `$transaction`<br>`getAdminUserProfile`: A · — · —<br>`getUserProfile`: A · — · —<br>`getPublicUserProfile`: — · none · cache, tag USER<br>`getOwnerDisplayName`: A inside `cache()` · — · cache, tag USER | `userProfileKeys.profile` | `ui/` (greeting, profile quote); `features/dashboard/update-profile`, `widgets/dashboard/user-profile-manager`, `features/public/homepage-profile` |
| workspace-settings | none; `WorkspaceSettings` is `z.infer` in `settings-schema.ts`. Schema `settings-schema.ts` | `update-workspace-settings.ts`<br>`get-image-compression-settings.ts`<br>`get-workspace-settings.ts` (helper, no `'use server'`) | `updateWorkspaceSettings`: A · P (patch) · R WORKSPACE_SETTINGS `max`<br>`getImageCompressionSettings`: no own guard (delegates) · — · —<br>`getWorkspaceSettings`: A inside `cache()`, defaults on failure · — · cache, tag WORKSPACE_SETTINGS | none (provider is seeded server-side) | none in entity; `model/workspace-settings-context.tsx` (client provider and hook); `features/dashboard/media-library`, `app/[locale]/(protected)/dashboard/layout.tsx` |

## Key flows

- Admin CRUD: `apps/web/src/widgets/dashboard/tag-manager/ui/tag-manager.tsx:48` (`useCrudManager`) → `apps/web/src/entities/tag/api/*.ts` (A → P → Prisma → R) → managers invalidate `<x>Keys.adminList()` (per `apps/web/src/entities/admin-query-keys.spec.tsx:1-8`).
- Public cached read: `apps/web/src/entities/<x>/api/get-*.ts` → `handlePublicAction` → `withPublicActionHandler` (`apps/web/src/shared/api/public-action-template.ts:34-68`) → `unstable_cache` keyed by `cacheTags`; the write action's `revalidateTag` clears it.
- Blog comments: `apps/web/src/features/public/blog-comment/ui/blog-comment-section.tsx:110` → `postComment` (requireUser, 5 per min per user, mail in `after()`); the thread is read by `apps/web/src/entities/comment/query/use-comment-infinite-query.ts`, uncached.
- Image upload: `createScopedImageUploader(scope)` (`apps/web/src/widgets/dashboard/project-manager/ui/project-form.tsx:33`) → `apps/web/src/entities/media/api/upload-single-media.ts` compresses in the browser (settings memo 30 s) → images: `uploadMedia` compresses again on the server (`apps/web/src/entities/media/api/upload-media.ts:116`); video: `uploadVideoDirect` (prepare → PUT to signed URL → finalize).
- Settings: `apps/web/src/app/[locale]/(protected)/dashboard/layout.tsx` → `getWorkspaceSettings()` → `WorkspaceSettingsProvider`; `updateWorkspaceSettings` merges jsonb in SQL, then R WORKSPACE_SETTINGS.
- Profile: `apps/web/src/features/dashboard/update-profile/lib/use-profile-controller.tsx:79` → `saveProfile` (one `$transaction` for profile, translations, social links) → R USER and SOCIAL after commit.
- Contact form: `apps/web/src/features/public/contact-me/ui/form/contact-form.tsx:79` → `sendContactMessage` (3 per 10 min per IP, mail in `after()`, R CONTACT, which `apps/web/src/features/dashboard/dashboard-stats/lib/get-dashboard-stats.ts` reads).
- Open source: `getOpenSourceContributions` → GitHub GraphQL (`apps/web/src/entities/open-source/lib/fetch-merged-pull-requests.ts:3`) → `groupByRepo` → cached 3600 s under OPEN_SOURCE; no write invalidates it.

## Recipes

1. Add an admin action to a CRUD entity (example: tag)
   1. Schema: `apps/web/src/entities/tag/model/tag-schema.ts`.
   2. Action: `apps/web/src/entities/tag/api/create-tag.ts` pattern. `'use server'`, `requireAdmin()` inside try, `parseInput`, Prisma, `revalidateTag(CACHE_TAGS.TAG, 'max')` after the write, `ApiResponse` with `errorMsg`.
   3. Export it from `apps/web/src/entities/tag/api/index.ts`, unless it is a picker (see gotchas).
   4. Manager: `useCrudManager` in `apps/web/src/widgets/dashboard/tag-manager/ui/tag-manager.tsx:48`; invalidate `tagKeys.adminList()` from `apps/web/src/entities/tag/model/query-keys.ts`.
2. Add a cached public read (example: projects)
   1. Params schema: `apps/web/src/entities/project/model/public-project-schema.ts`; call `parseInput` first.
   2. Wrap with `handlePublicAction` and `withPublicActionHandler(..., { cache: true, cacheKey: [every closure arg], cacheTags: [CACHE_TAGS.X] })`. Pattern: `apps/web/src/entities/project/api/get-paginated-public-projects.ts:174-189`.
   3. Client and server prefetch call the same factory: `apps/web/src/app/[locale]/(public)/projects/page.tsx:55` and `apps/web/src/widgets/public/projects-content/ui/projects-content.tsx:92`.
3. Add a workspace setting (no migration: `preferences` is `Json @default("{}")`, `packages/db/prisma/schema.prisma:871`)
   1. Add the field to `workspaceSettingsSchema` and to `WORKSPACE_SETTINGS_DEFAULTS` in `apps/web/src/entities/workspace-settings/model/settings-schema.ts` (lines 26-50). The patch schema is `.partial()` (lines 94-98), so the action needs no change.
   2. Read on the server with `getWorkspaceSettings()`; on the client with `useWorkspaceSettings()` (`apps/web/src/entities/workspace-settings/model/workspace-settings-context.tsx:150`).
   3. Write with `updateWorkspaceSettings({ field: value })` (`apps/web/src/entities/workspace-settings/api/update-workspace-settings.ts:34`).

## Gotchas

- `withPublicActionHandler` appends the locale to `cacheKey` and nothing else; page, ids and filters must be in the key yourself (`apps/web/src/shared/api/public-action-template.ts:50`).
- No `CACHE_TAGS.COMMENT` or `CACHE_TAGS.MEDIA` read exists in `apps/web/src`, so their `revalidateTag` calls invalidate nothing today.
- `revalidateTag` uses profile `'max'` everywhere except `apps/web/src/entities/comment/api/post-comment.ts:75` and `apps/web/src/entities/tech-stack/api/update-tech-stack.ts:63` (`'default'`).
- `hideComment` is ownership-scoped only by `where: { id, userId }` (`apps/web/src/entities/comment/api/hide-comment.ts:24-28`). Keep the userId. Only the admin `setCommentVisibility` can unhide.
- `apps/web/src/entities/project/api/index.ts` and `apps/web/src/entities/tag/api/index.ts` omit the picker actions, so they are imported by path (`apps/web/src/features/dashboard/blog-editor/lib/use-blog-reference-options.ts:11`, `apps/web/src/entities/tag/query/use-tag-options.ts:8`). `apps/web/src/entities/workspace-settings/api/index.ts:1-6` and `apps/web/src/entities/user-profile/api/index.ts:1-7` omit their helpers on purpose.
- `getWorkspaceSettings` returns defaults on any failure, including a missing admin session (`apps/web/src/entities/workspace-settings/api/get-workspace-settings.ts:102-109`), so `getImageCompressionSettings` never throws for a signed-out caller.
- `deleteMedia` deletes the storage object (`apps/web/src/entities/media/api/delete-media.ts:35`) before the row (`:37`). A failed row delete leaves a row whose file is gone.
- `projectKeys.publicList` and `tagKeys.infinite` have no locale segment, but their actions resolve titles by locale (`apps/web/src/entities/project/api/get-paginated-public-projects.ts:88`, `apps/web/src/entities/tag/api/get-paginated-public-tags.ts:31`). `tagKeys.options` includes one for this reason.

## Run

```bash
bun run check                            # repo gate: root "check" -> scripts/check.sh
cd apps/web && bun test src/entities     # all entity specs, including this slice's 12 and the root admin-keys spec
cd apps/web && bun run check-types       # tsc --noEmit
cd apps/web && bun run lint              # eslint .
```

## AGENTS.md deviations

- `apps/web/src/entities/comment/api/post-comment.ts:26` — §8: schema defined inline; it belongs in `apps/web/src/entities/comment/model/comment-schema.ts`.
- `apps/web/src/entities/project/api/get-public-project-by-id.ts:15` — §8: `id` is never parsed (no `parseInput(idSchema)`).
- `apps/web/src/entities/contact-message/api/get-paginated-contacts.ts:15-17` — §8: `filter.search` goes to Prisma unparsed.
- `apps/web/src/entities/comment/api/set-comment-visibility.ts:15` — §8: `hidden` is not validated.
- `apps/web/src/entities/project/api/create-project.ts:12`, `update-project.ts:12`, `delete-project.ts:11` — §8: no try/catch, so a DB error throws instead of returning `{ success: false, errorMsg }`.
- `apps/web/src/entities/workspace-settings/api/get-image-compression-settings.ts:19` — §8: returns a bare config, not `ApiResponse`. §5: no `requireAdmin()` of its own (lines 19-22); the guard sits inside `getWorkspaceSettings`, which fails soft.
- `apps/web/src/entities/media/api/upload-single-media.ts:1`, `apps/web/src/entities/media/api/upload-video-direct.ts:1` — §8: client code under `api/` without `'use server'`.
- `apps/web/src/entities/workspace-settings/api/get-workspace-settings.ts:1`, `apps/web/src/entities/user-profile/api/get-owner-display-name.ts:1` — §8: not server actions; intentional per their comments, still outside the letter of the rule.
- `apps/web/src/entities/user-profile/api/get-public-user-profile.ts:22-33` — §8: translations read with no `language: { in: … }` filter.
- `apps/web/src/entities/user-profile/api/get-public-user-profile.ts:18-20`, `apps/web/src/entities/project/api/get-paginated-public-projects.ts:59-60` — §8: closure-captured `userId` is absent from `cacheKey`. It is an env constant, so harmless today.
- `apps/web/src/entities/media/api/upload-single-media.ts:12` — §3: deep cross-slice import; the barrel exports it.
- `apps/web/src/entities/media/api/upload-media.ts:20` — §3: deep import of `getWorkspaceSettings`, which the barrel omits on purpose (`apps/web/src/entities/workspace-settings/api/index.ts:1-6`).
- `apps/web/src/entities/project/ui/project-timeline-item.tsx:11-12` — §3: deep cross-slice UI imports from the tag and tech-stack `ui/` folders.
- `apps/web/src/entities/social-link/api/get-all-public-contacts.ts:27`, `apps/web/src/entities/open-source/api/get-open-source-contributions.ts:49`, `apps/web/src/entities/tech-stack/api/get-all-public-tech-stacks.ts:41`, `apps/web/src/entities/tech-stack/api/get-paginated-public-tech-stacks.ts:47`, `apps/web/src/entities/tag/api/get-paginated-public-tags.ts:64` — §6: `CACHE_TAGS` used as an unstable_cache `cacheKey`; the rule says it is only for `revalidateTag`.
- `apps/web/src/entities/open-source/lib/fetch-merged-pull-requests.ts:3` — §11.7: hardcoded endpoint URL (the public GitHub GraphQL API).
- `apps/web/src/entities/workspace-settings/model/settings-schema.ts`, `apps/web/src/entities/project/model/public-project-schema.ts` — §8: schema file names are not `<slice>-schema.ts`.
- §11.14: 72 comment blocks over three lines (media 29, workspace-settings 19, user-profile 6, open-source 6, project 4, comment 4, tag 3, contact-message 1). Largest: `apps/web/src/entities/workspace-settings/api/get-workspace-settings.ts:61-99` (39 lines).

## See also

- [web-entities-content.md](web-entities-content.md): blog, company, education, featured-work, the other entities.
- [web-features.md](web-features.md): the features that call these actions.
- [web-widgets.md](web-widgets.md): the manager widgets that consume the CRUD actions.
- [web-shared.md](web-shared.md): `apps/web/src/shared/api` public handler, auth, `validate-action-input`, `constants`.
- [packages-db.md](packages-db.md): the Prisma models behind these reads and writes.
- [../architecture.md](../architecture.md)
