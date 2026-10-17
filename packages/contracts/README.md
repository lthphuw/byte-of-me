# @byte-of-me/contracts

Layer 2 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

The pure contracts of the entities: the zod form and params schemas, the TanStack query-key
factories, the upload constraints and the cache-tag maps. Every export is client-safe
(`sideEffects: false`, zod plus `@byte-of-me/api-core` and the light
`@byte-of-me/rich-text-schema` subpaths only), so a `'use client'` file may import any of
them. No `react`, no `next/*`, no `@/` alias, and no database: `contracts` is on the
`noReact` and `dbTypesOnly` lists in `boundaries.json`. Prisma-derived types
(`entities/*/model/types.ts`, `admin-*-include.ts`) stay in `apps/web`.

One subpath per entity that has something to export:

- `./blog`: `blogFormSchema`, `publicBlogsParamsSchema`,
  `relatedPublicBlogsParamsSchema`, `MAX_RELATED_BLOGS`, `BlogFormValues`, `blogKeys`.
- `./comment`: `publicCommentsParamsSchema`, `commentKeys`.
- `./company`: `companySchema`, `CompanyFormValues`, `companyKeys`.
- `./contact-message`: `contactMessageSchema`, `createContactMessageSchema`,
  `ContactMessageFormValues`, `MESSAGE_MAX_LENGTH`, `contactMessageKeys`.
- `./education`: `educationSchema`, `EducationFormValues`, `educationKeys`.
- `./featured-work`: `featuredWorkSchema`, the `FEATURED_WORK_*` limits,
  `FeaturedWorkFormValues`, `featuredWorkKeys`.
- `./media`: `mediaScopeSchema`, the video upload schemas, `mediaKeys`, and
  `upload-constraints` (size and batch limits, accepted MIME types, `MEDIA_SCOPES`,
  `findUploadViolation`, `pickUploadPath`, the byte-signature sniffers
  `detectMediaMimeType` / `resolveUploadedMimeType`, `sanitizeStoredFileName`,
  `MediaViolationError`).
- `./project`: `projectSchema`, `publicProjectsParamsSchema`, `PublicProjectFilters`,
  `projectKeys`.
- `./tag`: `tagSchema`, `TagFormValues`, `tagKeys`, `TAG_MUTATION_TAGS`.
- `./tech-stack`: `techStackSchema`, `TechStackFormValues`, `techStackKeys`,
  `TECH_MUTATION_TAGS`.
- `./user-profile`: `userProfileSchema`, `createUserProfileSchema`,
  `UserProfileFormValues`, `userProfileKeys`.
- `./workspace-settings`: `workspaceSettingsPatchSchema`, `parseWorkspaceSettings`,
  `WORKSPACE_SETTINGS_DEFAULTS`, `workspaceSettingsKeys`.

The root (`.`) holds what more than one entity or compressor shares: `richTextDocSchema`
and `RichTextDoc` (blog and user-profile), and the image-compression config and rules
(`imageCompressionConfigSchema`, `IMAGE_COMPRESSION_DEFAULTS`, `computeTargetDimensions`,
`shouldSkipCompression`, `shouldKeepOriginal`), which the settings schema embeds and both
compressors in `apps/web` read.

A query key is a contract with the server prefetch: change a factory's shape and a page
that prefetches with the old one hydrates nothing, with no error. Change a key here only
together with every prefetch that uses it.

Specs run from this directory with `bun test`; none needs a DOM.
