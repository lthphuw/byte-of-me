# Work Experience Manager & Comment Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Work Experience manager at `/dashboard/companies` and comment moderation at a new `/dashboard/comments` page, per `docs/superpowers/specs/2026-07-11-work-experience-and-comment-moderation-design.md`.

**Architecture:** Both features follow the repo's entity → widget → page layering. The company entity already has the zod schema and create/update/get-all-admin server actions; we add `delete-company` and build the manager widget mirroring `education-manager` (single dialog, nested `useFieldArray` sections, shared `TranslationTabs`). Comments get two new admin server actions plus a paginated manager widget mirroring `translation-manager`'s list/pagination shape.

**Tech Stack:** Next.js App Router server actions, Prisma, TanStack Query, react-hook-form + zod, shadcn/ui via `@byte-of-me/ui`, next-intl for sidebar labels.

## Global Constraints

- No new dependencies (CLAUDE.md Rule 1). No `any`, no `@ts-ignore` (Rules 2–3).
- Entity `api/index.ts` convention: **company** follows the education convention — index exports only the public fetcher; admin actions are imported by direct path (e.g. `@/entities/education/api/create-education`). **comment** `api/index.ts` already exports everything, so new comment actions ARE added to it. (This corrects the spec's "export admin actions from company index" line — consistency with education wins, Rule 19.)
- Server actions: `'use server'`, `requireAdmin()`, try/catch → `ApiResponse`, `logger.error`, `revalidateTag(CACHE_TAGS.X, 'max')` after mutations.
- No test runner exists in `apps/web`; verification per task = typecheck + lint, run from `apps/web` via bun (no node on this machine):
  - typecheck: `cd apps/web && ~/.bun/bin/bun node_modules/typescript/lib/tsc.js --noEmit --incremental false`
  - lint (targeted): `cd apps/web && ~/.bun/bin/bun node_modules/eslint/bin/eslint.js <files>`
- Commits must use `--no-verify` (husky pre-commit needs node, unavailable). Commit only the files each task touches — the working tree has unrelated in-flight changes that must not be swept up.
- Dashboard-only strings stay hardcoded English in widgets (matches education/translation managers); only sidebar nav labels go through next-intl messages.

---

### Task 1: Complete the company entity API (`delete-company`)

**Files:**
- Create: `apps/web/src/entities/company/api/delete-company.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `CACHE_TAGS.COMPANY`, existing patterns from `apps/web/src/entities/education/api/delete-education.ts`.
- Produces: `deleteCompany(id: string): Promise<ApiResponse<Company>>` — used by Task 4's manager.

- [ ] **Step 1: Write `delete-company.ts`**

```ts
'use server';

import { type Company, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function deleteCompany(id: string): Promise<ApiResponse<Company>> {
  try {
    const user = await requireAdmin();

    const existing = await prisma.company.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, errorMsg: 'Company not found' };
    }

    const company = await prisma.company.delete({ where: { id } });

    revalidateTag(CACHE_TAGS.COMPANY, 'max');

    return { success: true, data: company };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete company');
    logger.error(`Delete company error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
```

(Schema cascades: deleting a company removes its roles, tasks, and all translations — `onDelete: Cascade` throughout.)

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && ~/.bun/bin/bun node_modules/typescript/lib/tsc.js --noEmit --incremental false`
Expected: exit 0 (or only pre-existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/entities/company/api/delete-company.ts
git commit --no-verify -m "feat(company): add deleteCompany admin action"
```

---

### Task 2: Company dialog nested field components (tasks + roles)

**Files:**
- Create: `apps/web/src/widgets/dashboard/company-manager/ui/company-task-item-field.tsx`
- Create: `apps/web/src/widgets/dashboard/company-manager/ui/company-role-item-field.tsx`

**Interfaces:**
- Consumes: `CompanyFormValues` from `@/entities/company/model/company-schema`; `TranslationTabs`, `TextField` from `@/shared/ui`; `Collapsible`, `DatePicker`, form primitives from `@byte-of-me/ui`.
- Produces: `CompanyTaskItemField({ roleIndex, index, control, remove })` and `CompanyRoleItemField({ index, control, remove })` — consumed by Task 3's dialog.

- [ ] **Step 1: Write `company-task-item-field.tsx`**

```tsx
'use client';

import type { Control } from 'react-hook-form';
import {
  Button,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@byte-of-me/ui';
import { X } from 'lucide-react';

import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import { TextField, TranslationTabs } from '@/shared/ui';

interface CompanyTaskItemFieldProps {
  roleIndex: number;
  index: number;
  control: Control<CompanyFormValues>;
  remove: (index: number) => void;
}

export function CompanyTaskItemField({
  roleIndex,
  index,
  control,
  remove,
}: CompanyTaskItemFieldProps) {
  return (
    <div className="relative space-y-4 rounded-lg border bg-muted/30 p-4 pt-8">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2"
        onClick={() => remove(index)}
      >
        <X className="h-4 w-4" />
      </Button>

      <FormField
        control={control}
        name={`roles.${roleIndex}.tasks.${index}.sortOrder`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sort</FormLabel>
            <Input
              type="number"
              value={Number(field.value)}
              onChange={(e) =>
                field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <TranslationTabs
        control={control}
        name={`roles.${roleIndex}.tasks.${index}.translations`}
        newTranslation={() => ({ language: '', content: '' })}
        renderFields={(i) => (
          <TextField
            control={control}
            name={`roles.${roleIndex}.tasks.${index}.translations.${i}.content`}
            label="Task"
          />
        )}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write `company-role-item-field.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { type Control, useFieldArray, useWatch } from 'react-hook-form';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DatePicker,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@byte-of-me/ui';
import { ChevronDown, Plus, X } from 'lucide-react';

import { CompanyTaskItemField } from './company-task-item-field';

import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import { cn } from '@/shared/lib/utils';
import { TextField, TranslationTabs } from '@/shared/ui';

interface CompanyRoleItemFieldProps {
  index: number;
  control: Control<CompanyFormValues>;
  remove: (index: number) => void;
}

export function CompanyRoleItemField({
  index,
  control,
  remove,
}: CompanyRoleItemFieldProps) {
  const [open, setOpen] = useState(true);

  const {
    fields: tasks,
    append: appendTask,
    remove: removeTask,
  } = useFieldArray({
    control,
    name: `roles.${index}.tasks`,
  });

  const title = useWatch({
    control,
    name: `roles.${index}.translations.0.title`,
  });

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border"
    >
      <div className="flex items-center justify-between p-2">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="gap-2">
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                !open && '-rotate-90'
              )}
            />
            <span className="font-medium">{title || `Role ${index + 1}`}</span>
          </Button>
        </CollapsibleTrigger>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => remove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CollapsibleContent className="space-y-4 border-t p-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`roles.${index}.startDate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <DatePicker
                  value={field.value ?? undefined}
                  onChange={(d) => field.onChange(d || null)}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`roles.${index}.endDate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <DatePicker
                  value={field.value ?? undefined}
                  onChange={(d) => field.onChange(d || null)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <TranslationTabs
          control={control}
          name={`roles.${index}.translations`}
          newTranslation={() => ({ language: '', title: '', description: '' })}
          renderFields={(i) => (
            <>
              <TextField
                control={control}
                name={`roles.${index}.translations.${i}.title`}
                label="Role Title"
              />
              <TextField
                control={control}
                name={`roles.${index}.translations.${i}.description`}
                label="Description"
              />
            </>
          )}
        />

        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Tasks</h4>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                appendTask({
                  sortOrder: tasks.length,
                  translations: [{ language: 'en', content: '' }],
                })
              }
            >
              <Plus className="mr-2 h-3 w-3" />
              Add Task
            </Button>
          </div>

          {tasks.map((task, taskIndex) => (
            <CompanyTaskItemField
              key={task.id}
              roleIndex={index}
              index={taskIndex}
              control={control}
              remove={removeTask}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

- [ ] **Step 3: Typecheck** (same command as Task 1). If `TranslationTabs`' generic `ArrayPath` typing rejects the template-literal nested paths, fix by widening at the call site with an explicit generic (`<CompanyFormValues, ...>`) — do NOT cast to `any`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/widgets/dashboard/company-manager
git commit --no-verify -m "feat(dashboard): company role/task nested form fields"
```

---

### Task 3: Company dialog

**Files:**
- Create: `apps/web/src/widgets/dashboard/company-manager/ui/company-dialog.tsx`

**Interfaces:**
- Consumes: `CompanyRoleItemField` (Task 2), `companySchema`/`CompanyFormValues`, `AdminCompany` type, `MediaSelect` from `@/features/dashboard/media-library/ui/media-select`, `MultiSelect` + dialog primitives from `@byte-of-me/ui`, `getAllAdminTechStack` from `@/entities/tech-stack/api/get-all-admin-tech-stacks`.
- Produces: `CompanyDialog({ open, onOpenChange, initialData, onSubmit, loading })` — consumed by Task 4.

- [ ] **Step 1: Write `company-dialog.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icons,
  MultiSelect,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { CompanyRoleItemField } from './company-role-item-field';

import type { AdminCompany } from '@/entities/company/model/types';
import {
  type CompanyFormValues,
  companySchema,
} from '@/entities/company/model/company-schema';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { TextField, TranslationTabs } from '@/shared/ui';

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Nullable<AdminCompany>;
  onSubmit: (data: CompanyFormValues) => void;
  loading?: boolean;
}

export function CompanyDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: CompanyDialogProps) {
  const { data: techData } = useQuery({
    queryKey: ['admin-techstacks-list'],
    queryFn: () => getAllAdminTechStack(),
    enabled: open,
  });

  const techOptions =
    techData?.data?.map((t) => ({ label: t.name, value: t.id })) || [];

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company: '',
      location: '',
      startDate: new Date(),
      endDate: null,
      logoId: null,
      translations: [{ language: 'en', description: '' }],
      techStackIds: [],
      roles: [],
    },
  });

  const {
    fields: roles,
    append: appendRole,
    remove: removeRole,
  } = useFieldArray({
    control: form.control,
    name: 'roles',
  });

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      form.reset({
        id: initialData.id,
        company: initialData.company,
        location: initialData.location,
        startDate: new Date(initialData.startDate),
        endDate: initialData.endDate ? new Date(initialData.endDate) : null,
        logoId: initialData.logoId ?? null,

        translations:
          initialData.translations?.length > 0
            ? initialData.translations.map((t) => ({
                id: t.id,
                language: t.language,
                description: t.description ?? '',
              }))
            : [{ language: 'en', description: '' }],

        techStackIds: initialData.techStacks?.map((t) => t.techStackId) ?? [],

        roles:
          initialData.roles?.map((r) => ({
            id: r.id,
            startDate: r.startDate ? new Date(r.startDate) : null,
            endDate: r.endDate ? new Date(r.endDate) : null,
            translations:
              r.translations?.length > 0
                ? r.translations.map((t) => ({
                    id: t.id,
                    language: t.language,
                    title: t.title,
                    description: t.description ?? '',
                  }))
                : [{ language: 'en', title: '', description: '' }],
            tasks:
              r.tasks?.map((task) => ({
                id: task.id,
                sortOrder: task.sortOrder ?? 0,
                translations:
                  task.translations?.length > 0
                    ? task.translations.map((t) => ({
                        id: t.id,
                        language: t.language,
                        content: t.content,
                      }))
                    : [{ language: 'en', content: '' }],
              })) ?? [],
          })) ?? [],
      });
    } else {
      form.reset();
    }
  }, [initialData, open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Work Experience' : 'Add Work Experience'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="logoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Logo</FormLabel>
                  <FormControl>
                    <MediaSelect
                      value={field.value ?? undefined}
                      onChange={(media) => field.onChange(media?.id ?? null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <TextField
                control={form.control}
                name="company"
                label="Company Name"
              />
              <TextField
                control={form.control}
                name="location"
                label="Location"
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <DatePicker value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <DatePicker
                      value={field.value ?? undefined}
                      onChange={(d) => field.onChange(d || null)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="techStackIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tech Stack</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={techOptions}
                      selected={field.value || []}
                      onValueChange={field.onChange}
                      placeholder="Select tech stack"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">Translations</h3>
              <TranslationTabs
                control={form.control}
                name="translations"
                newTranslation={() => ({ language: '', description: '' })}
                renderFields={(i) => (
                  <TextField
                    control={form.control}
                    name={`translations.${i}.description`}
                    label="Description"
                  />
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Roles</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    appendRole({
                      startDate: null,
                      endDate: null,
                      translations: [
                        { language: 'en', title: '', description: '' },
                      ],
                      tasks: [],
                    })
                  }
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Role
                </Button>
              </div>

              {roles.map((role, index) => (
                <CompanyRoleItemField
                  key={role.id}
                  index={index}
                  control={form.control}
                  remove={removeRole}
                />
              ))}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}{' '}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck** (same command). Adjust `MediaSelect`/`MultiSelect` prop names only if tsc complains — copy exactly what `education-dialog.tsx` / `project-dialog.tsx` pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/widgets/dashboard/company-manager
git commit --no-verify -m "feat(dashboard): company dialog with nested roles and tasks"
```

---

### Task 4: Company manager widget + page wiring

**Files:**
- Create: `apps/web/src/widgets/dashboard/company-manager/ui/company-manager.tsx`
- Create: `apps/web/src/widgets/dashboard/company-manager/ui/index.ts` (`export * from './company-manager';`)
- Create: `apps/web/src/widgets/dashboard/company-manager/index.ts` (`export * from './ui';`)
- Modify: `apps/web/src/widgets/dashboard/index.ts` (add `export * from './company-manager';` in alphabetical order)
- Modify: `apps/web/src/app/[locale]/(protected)/dashboard/companies/page.tsx` (render the widget)
- Modify: `apps/web/src/widgets/dashboard/dashboard-sidebar/ui/dashboard-sidebar.tsx` (remove `soon: true` from the companies item)

**Interfaces:**
- Consumes: `CompanyDialog` (Task 3), `deleteCompany` (Task 1), `getAllAdminCompanies`, `createCompany`, `updateCompany` (existing, direct-path imports), `ManagerListState`/`ManagerPageHeader` from `@/shared/ui`.
- Produces: `CompanyManager()` widget.

- [ ] **Step 1: Write `company-manager.tsx`** — mirror `education-manager.tsx` exactly, with these substitutions:

```tsx
'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDeleteDialog,
  DeleteButton,
  EditButton,
  Loading,
} from '@byte-of-me/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

import { CompanyDialog } from './company-dialog';

import { createCompany } from '@/entities/company/api/create-company';
import { deleteCompany } from '@/entities/company/api/delete-company';
import { getAllAdminCompanies } from '@/entities/company/api/get-all-admin-companies';
import { updateCompany } from '@/entities/company/api/update-company';
import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import type { AdminCompany } from '@/entities/company/model/types';
import { formatDate } from '@/shared/lib/utils';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function CompanyManager() {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminCompany | null>(null);
  const [open, setOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<AdminCompany | null>(
    null
  );

  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['companies'],
    queryFn: getAllAdminCompanies,
  });

  const companies = response?.success ? response.data : [];

  const saveMutation = useMutation({
    mutationFn: (values: CompanyFormValues) =>
      editing ? updateCompany(editing.id, values) : createCompany(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast(editing ? 'Work experience updated' : 'Work experience created');
      setOpen(false);
    },
    onError: () => toast.error('Error saving work experience'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast('Work experience removed');
      setCompanyToDelete(null);
    },
    onError: () => toast.error('Error deleting work experience'),
  });

  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (company: AdminCompany) => {
    setEditing(company);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title="Work Experience"
        description="Maintain your professional timeline and company records"
        action={
          <Button onClick={handleCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Experience
          </Button>
        }
      />

      <div className="relative min-h-[200px] space-y-4">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isEmpty={companies.length === 0}
          emptyTitle="No work experience"
          emptyDescription="Start by adding the first company you worked with."
          emptyAction={
            <Button variant="outline" size="sm" onClick={handleCreate}>
              Add Your First Entry
            </Button>
          }
          skeleton={
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <Loading />
              <p className="animate-pulse text-xs text-muted-foreground">
                Loading records...
              </p>
            </div>
          }
        >
          <div className="grid gap-4">
            {companies.map((company) => {
              const dateRange = `${formatDate(company.startDate)} — ${
                company.endDate ? formatDate(company.endDate) : 'Present'
              }`;

              return (
                <div
                  key={company.id}
                  className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {company.logo?.url ? (
                        <Image
                          src={company.logo.url}
                          alt={company.company}
                          fill
                          className="object-contain p-2"
                        />
                      ) : (
                        <Briefcase className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-semibold leading-none">
                        {company.company}
                      </h4>
                      <p className="text-xs font-medium text-muted-foreground">
                        {company.location} · {dateRange}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge
                          variant="secondary"
                          className="px-2 py-0 text-[10px]"
                        >
                          {company.roles.length}{' '}
                          {company.roles.length === 1 ? 'Role' : 'Roles'}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="px-2 py-0 text-[10px]"
                        >
                          {company.techStacks.length} Tech
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <EditButton onClick={() => handleEdit(company)} />
                    <DeleteButton
                      isSubmitting={
                        deleteMutation.isPending &&
                        companyToDelete?.id === company.id
                      }
                      onClick={() => setCompanyToDelete(company)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ManagerListState>

        {!isLoading && isFetching && (
          <div className="absolute right-2 top-2">
            <Loading />
          </div>
        )}
      </div>

      <CompanyDialog
        key={editing?.id || 'new'}
        open={open}
        onOpenChange={setOpen}
        initialData={editing}
        onSubmit={(values) => saveMutation.mutate(values)}
        loading={saveMutation.isPending}
      />

      <ConfirmDeleteDialog
        isOpen={!!companyToDelete}
        isLoading={deleteMutation.isPending}
        onClose={() => setCompanyToDelete(null)}
        onConfirm={() =>
          companyToDelete && deleteMutation.mutate(companyToDelete.id)
        }
        description={`Are you sure you want to delete "${
          companyToDelete?.company ?? ''
        }" and all of its roles?`}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create the two `index.ts` barrels and add the widget export** to `widgets/dashboard/index.ts` (alphabetical: after `./blog-manager`, before `./contact-message-gallery`).

- [ ] **Step 3: Wire the page.** In `dashboard/companies/page.tsx`, replace the placeholder body:

```tsx
import type { Metadata } from 'next';

import { CompanyManager } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Experience',
  description: 'Manage your professional work history and company records.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function CompaniesPage() {
  return (
    <div className="space-y-6">
      <CompanyManager />
    </div>
  );
}
```

- [ ] **Step 4: Remove `soon: true`** from the companies nav item in `dashboard-sidebar.tsx`.

- [ ] **Step 5: Typecheck + lint the new widget files.** Same commands as Global Constraints.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/widgets/dashboard/company-manager apps/web/src/widgets/dashboard/index.ts "apps/web/src/app/[locale]/(protected)/dashboard/companies/page.tsx" apps/web/src/widgets/dashboard/dashboard-sidebar/ui/dashboard-sidebar.tsx
git commit --no-verify -m "feat(dashboard): work experience manager"
```

---

### Task 5: Comment admin entity layer

**Files:**
- Modify: `apps/web/src/entities/comment/model/types.ts` (add `AdminComment`)
- Create: `apps/web/src/entities/comment/api/get-paginated-admin-comments.ts`
- Create: `apps/web/src/entities/comment/api/set-comment-visibility.ts`
- Modify: `apps/web/src/entities/comment/api/hide-comment.ts` (ownership check)
- Modify: `apps/web/src/entities/comment/api/index.ts` (export the two new actions)

**Interfaces:**
- Produces: `AdminComment` (Prisma payload with user/blog/project includes); `getPaginatedAdminComments(page?, limit?): Promise<ApiResponse<PaginatedData<AdminComment>>>`; `setCommentVisibility(commentId: string, hidden: boolean): Promise<ApiResponse<Comment>>` — consumed by Task 6.

- [ ] **Step 1: Add `AdminComment` to `types.ts`** (below `PublicComment`; add `import type { Prisma } from '@byte-of-me/db';` at top):

```ts
export type AdminComment = Prisma.CommentGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true; image: true } };
    blog: {
      select: {
        id: true;
        slug: true;
        translations: { select: { language: true; title: true } };
      };
    };
    project: {
      select: {
        id: true;
        translations: { select: { language: true; title: true } };
      };
    };
  };
}>;
```

- [ ] **Step 2: Write `get-paginated-admin-comments.ts`**

```ts
'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminComment } from '@/entities/comment/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminComments(
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<PaginatedData<AdminComment>>> {
  try {
    await requireAdmin();

    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      prisma.comment.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          blog: {
            select: {
              id: true,
              slug: true,
              translations: { select: { language: true, title: true } },
            },
          },
          project: {
            select: {
              id: true,
              translations: { select: { language: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.comment.count(),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch comments');
    logger.error(`[Comment] getPaginatedAdmin: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
```

- [ ] **Step 3: Write `set-comment-visibility.ts`**

```ts
'use server';

import { type Comment, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function setCommentVisibility(
  commentId: string,
  hidden: boolean
): Promise<ApiResponse<Comment>> {
  try {
    await requireAdmin();

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: hidden },
    });

    revalidateTag(CACHE_TAGS.COMMENT, 'max');

    return { success: true, data: comment };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'Failed to update comment visibility'
    );
    logger.error(`Set comment visibility error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
```

- [ ] **Step 4: Fix `hide-comment.ts` ownership.** Change the update's `where` from `{ id: commentId }` to `{ id: commentId, userId: user.id }` so authors can only hide their own comments (the `user` variable already exists from `requireUser()`).

- [ ] **Step 5: Export from `api/index.ts`** — add (alphabetical):

```ts
export * from './get-paginated-admin-comments';
export * from './set-comment-visibility';
```

- [ ] **Step 6: Typecheck.** Then commit:

```bash
git add apps/web/src/entities/comment
git commit --no-verify -m "feat(comment): admin moderation actions and ownership fix for hideComment"
```

---

### Task 6: Comment manager widget, page, and navigation

**Files:**
- Create: `apps/web/src/widgets/dashboard/comment-manager/ui/comment-manager.tsx`
- Create: `apps/web/src/widgets/dashboard/comment-manager/ui/index.ts` (`export * from './comment-manager';`)
- Create: `apps/web/src/widgets/dashboard/comment-manager/index.ts` (`export * from './ui';`)
- Modify: `apps/web/src/widgets/dashboard/index.ts`
- Create: `apps/web/src/app/[locale]/(protected)/dashboard/comments/page.tsx`
- Create: `apps/web/src/app/[locale]/(protected)/dashboard/comments/loading.tsx`
- Modify: `packages/ui/src/icons.tsx` (add `comments: MessagesSquare` to the Dashboard Specific block + `MessagesSquare` to the lucide import)
- Modify: `apps/web/src/widgets/dashboard/dashboard-sidebar/ui/dashboard-sidebar.tsx` (nav item after blogs in the portfolio group; also remove `soon: true` from translations — it shipped)
- Modify: `apps/web/messages/en.json` + `apps/web/messages/vi.json` (`dashboard.sidebar.items.comments`)

**Interfaces:**
- Consumes: `getPaginatedAdminComments`, `setCommentVisibility`, `AdminComment` from `@/entities/comment` (Task 5); `Pagination`, `Avatar*`, `Badge`, `ConfirmDeleteDialog` from `@byte-of-me/ui`.
- Produces: `CommentManager()` widget.

- [ ] **Step 1: Write `comment-manager.tsx`**

```tsx
'use client';

import { useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  ConfirmDeleteDialog,
  Loading,
  Pagination,
} from '@byte-of-me/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import type { AdminComment } from '@/entities/comment';
import { getPaginatedAdminComments } from '@/entities/comment/api/get-paginated-admin-comments';
import { setCommentVisibility } from '@/entities/comment/api/set-comment-visibility';
import { formatDate } from '@/shared/lib/utils';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

const PAGE_SIZE = 12;

function commentSource(comment: AdminComment): string {
  if (comment.blog) {
    return `Blog: ${comment.blog.translations[0]?.title ?? comment.blog.slug}`;
  }
  if (comment.project) {
    return `Project: ${comment.project.translations[0]?.title ?? 'Untitled'}`;
  }
  return 'Unknown source';
}

export function CommentManager() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [commentToHide, setCommentToHide] = useState<AdminComment | null>(
    null
  );

  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useQuery({
    queryKey: ['admin-comments', page],
    queryFn: () => getPaginatedAdminComments(page, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  const comments = response?.success ? response.data.data : [];
  const pagination = response?.success ? response.data.meta : undefined;

  const visibilityMutation = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      setCommentVisibility(id, hidden),
    onSuccess: (_, { hidden }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
      toast(hidden ? 'Comment hidden' : 'Comment restored');
      setCommentToHide(null);
    },
    onError: () => toast.error('Error updating comment'),
  });

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title="Comments"
        description="Moderate comments left on your blogs and projects"
      />

      <div className="relative min-h-[300px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isEmpty={comments.length === 0}
          emptyTitle="No comments yet"
          emptyDescription="Comments on your blogs and projects will show up here."
          skeleton={
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loading />
              <p className="animate-pulse text-xs text-muted-foreground">
                Fetching comments...
              </p>
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-3 rounded-lg border bg-card p-3"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage
                    src={comment.user.image ?? undefined}
                    alt={comment.user.name ?? 'User'}
                  />
                  <AvatarFallback>
                    {(comment.user.name ?? '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.user.name ?? comment.user.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                    {comment.isDeleted && (
                      <Badge variant="destructive" className="text-[10px]">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="break-words text-sm text-muted-foreground">
                    {comment.content}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {commentSource(comment)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {comment.isDeleted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={visibilityMutation.isPending}
                      onClick={() =>
                        visibilityMutation.mutate({
                          id: comment.id,
                          hidden: false,
                        })
                      }
                    >
                      <Eye className="h-4 w-4" />
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setCommentToHide(comment)}
                    >
                      <EyeOff className="h-4 w-4" />
                      Hide
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ManagerListState>

        {!isLoading && isFetching && (
          <div className="absolute -top-12 right-0">
            <Loading />
          </div>
        )}
      </div>

      {pagination && comments.length > 0 && (
        <div className="pt-4">
          <Pagination
            pagination={pagination}
            setPage={setPage}
            isPlaceholderData={isPlaceholderData}
          />
        </div>
      )}

      <ConfirmDeleteDialog
        isOpen={!!commentToHide}
        isLoading={visibilityMutation.isPending}
        onClose={() => setCommentToHide(null)}
        onConfirm={() =>
          commentToHide &&
          visibilityMutation.mutate({ id: commentToHide.id, hidden: true })
        }
        title="Hide Comment"
        description="This comment will no longer be visible to visitors. You can restore it later."
      />
    </div>
  );
}
```

(If `ManagerPageHeader` requires an `action` prop, pass `action={undefined}` — check `shared/ui` signature; if `AdminComment` isn't re-exported from `@/entities/comment`, import from `@/entities/comment/model/types`.)

- [ ] **Step 2: Create barrels + widget export** (same shape as Task 4 Step 2).

- [ ] **Step 3: Create the page and loading files.**

`comments/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { CommentManager } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Comments',
  description: 'Moderate comments on your blogs and projects.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function CommentsPage() {
  return (
    <div className="space-y-6">
      <CommentManager />
    </div>
  );
}
```

`comments/loading.tsx`:

```tsx
export { DashboardPageLoading as default } from '@/shared/ui';
```

- [ ] **Step 4: Icon + sidebar + messages.**
  - `packages/ui/src/icons.tsx`: add `MessagesSquare` to the lucide import list (alphabetical) and `comments: MessagesSquare,` after `media:` in the Dashboard Specific block.
  - Sidebar portfolio group, after the blogs item:

```ts
{
  href: '/dashboard/comments',
  label: t('items.comments'),
  icon: Icons.comments,
},
```

  - Remove `soon: true` from the translations item (feature shipped).
  - `messages/en.json` `dashboard.sidebar.items`: add `"comments": "Comments"` after `"blogs"`. `messages/vi.json`: add `"comments": "Bình luận"` after `"blogs"`.

- [ ] **Step 5: Typecheck + lint.** Then commit:

```bash
git add apps/web/src/widgets/dashboard/comment-manager apps/web/src/widgets/dashboard/index.ts "apps/web/src/app/[locale]/(protected)/dashboard/comments" packages/ui/src/icons.tsx apps/web/src/widgets/dashboard/dashboard-sidebar/ui/dashboard-sidebar.tsx apps/web/messages/en.json apps/web/messages/vi.json
git commit --no-verify -m "feat(dashboard): comment moderation page"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full typecheck** — `cd apps/web && ~/.bun/bin/bun node_modules/typescript/lib/tsc.js --noEmit --incremental false` → exit 0.
- [ ] **Step 2: Lint all new/changed files** — `cd apps/web && ~/.bun/bin/bun node_modules/eslint/bin/eslint.js src/entities/company/api/delete-company.ts src/entities/comment src/widgets/dashboard/company-manager src/widgets/dashboard/comment-manager` → no errors.
- [ ] **Step 3: If the dev server can run in this environment, drive the flows** (create/edit/delete a company with nested roles/tasks; hide + restore a comment). If it cannot (no node, pnpm install pending), state that runtime verification is deferred and list exactly what was verified statically.
