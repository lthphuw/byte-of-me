# Work Experience Manager & Comment Moderation — Design

**Date:** 2026-07-11
**Status:** Approved

## Context

Of the five planned dashboard features (work experience, translations, comments/contacts, analytics, co-authors), three are already built: the Translations manager, the Analytics section on the dashboard home (`AnalyticsOverview` + `StatsGrid`), and project co-author support. Contact messages already have a gallery on the dashboard home. This spec covers the two remaining pieces:

1. **Work Experience manager** at `/dashboard/companies` (currently a placeholder page).
2. **Comment moderation** at a new `/dashboard/comments` page.

No database schema changes are needed — `Company → Role → Task` (each with translations), `Comment` (with `isDeleted`), and all supporting models already exist.

## 1. Work Experience Manager

### Entity layer (`apps/web/src/entities/company`)

Already exists and is reused unchanged: `companySchema` (zod, full nested Company → Roles → Tasks shape with translations), `create-company.ts`, `update-company.ts`, `get-all-admin-companies.ts`, `AdminCompany` type.

New/changed:

- **`api/delete-company.ts`** — new server action modeled on `delete-education.ts`: `requireAdmin`, `prisma.company.delete({ where: { id } })` (schema `onDelete: Cascade` removes roles, tasks, and all translations), `revalidateTag(CACHE_TAGS.COMPANY, 'max')`, returns `ApiResponse`.
- **`api/index.ts`** — export the admin actions (`create-company`, `update-company`, `delete-company`, `get-all-admin-companies`) alongside the existing public export.

### Widget (`apps/web/src/widgets/dashboard/company-manager/ui/`)

Mirrors the education manager pattern, one nesting level deeper:

- **`company-manager.tsx`** — client component. TanStack Query on key `['companies']` → `getAllAdminCompanies`. `ManagerPageHeader` ("Work Experience") with an Add button. `ManagerListState` for loading/error/empty states. Card rows: logo (`next/image`, fallback icon), company name, location, formatted date range, badges for role count and tech stack count. Hover-revealed `EditButton`/`DeleteButton`. Save mutation switches between `createCompany`/`updateCompany` based on editing state; delete goes through `ConfirmDeleteDialog`. Toasts via `sonner`.
- **`company-dialog.tsx`** — `useForm` + `zodResolver(companySchema)`, reset from `initialData` on open (education-dialog pattern). Fields: company name, location (`TextField`), start/end (`DatePicker`), logo (`MediaSelect`), tech stacks (`MultiSelect` fed by a `['admin-techstacks-list']` query on `getAllAdminTechStack`, as in the project dialog), company description per language (`TranslationTabs`). Roles section via `useFieldArray`.
- **`company-role-item-field.tsx`** — one collapsible section per role: start/end dates, `TranslationTabs` for title (required) and description, nested Tasks field array, remove-role button.
- **`company-task-item-field.tsx`** — per-task row modeled on `education-achievement-item-field`: `TranslationTabs` for content, `sortOrder`, remove-task button.

### Wiring

- Export `CompanyManager` from `widgets/dashboard/index.ts`.
- Render `<CompanyManager />` in `dashboard/companies/page.tsx`, replacing the placeholder markup (header text moves into `ManagerPageHeader`).
- Existing `loading.tsx` stays.

## 2. Comment Moderation

### Entity layer (`apps/web/src/entities/comment/api`)

- **`get-paginated-admin-comments.ts`** — new server action: `requireAdmin`; paginated newest-first following the `get-paginated-admin-translations` pattern; includes hidden comments; includes author (`user.name`, `user.image`) and the parent blog/project title (via translations) for source labeling.
- **`set-comment-visibility.ts`** — new server action: `requireAdmin`; sets `isDeleted` to `true` (hide) or `false` (restore); `revalidateTag(CACHE_TAGS.COMMENT, 'max')`; returns `ApiResponse`.
- **`hide-comment.ts` fix** — the existing author-facing action calls `requireUser` with no ownership check, so any signed-in user can hide any comment. Add an ownership guard: the `update` must be scoped to `{ id: commentId, userId: user.id }`.

### Widget (`apps/web/src/widgets/dashboard/comment-manager/ui/`)

- **`comment-manager.tsx`** — paginated list following the translation-manager pattern: each row shows author (avatar + name), comment content, source ("Blog: …" / "Project: …"), date, and a "Hidden" badge when `isDeleted`. Actions: Hide (with confirm dialog) and Restore. Mutations invalidate the admin comments query.

### Page & navigation

- New `dashboard/comments/page.tsx` + `loading.tsx`, copied from the translations page pattern (noindex metadata, renders the widget).
- Sidebar nav item in the dashboard sidebar's content group with a message icon.

## Error handling

All server actions follow the repo convention: try/catch, `logger.error` with context, `ApiResponse` `{ success, data | errorMsg }`. UI surfaces failures via `toast.error` and `ManagerListState` error state with retry.

## Verification

- `tsc --noEmit` and ESLint pass (run via bun per toolchain constraints).
- Drive both flows in the running app: create/edit/delete a company with nested roles and tasks; hide and restore a comment from the new page.
