'use client';

import {
  Badge,
  Button,
  ConfirmDeleteDialog,
  DeleteButton,
  EditButton,
  Pagination,
} from '@byte-of-me/ui';
import { GraduationCap, Plus } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { EducationDialog } from './education-dialog';

import type { AdminEducationListItem } from '@/entities/education';
import { createEducation } from '@/entities/education/api/create-education';
import { deleteEducation } from '@/entities/education/api/delete-education';
import { getAdminEducationById } from '@/entities/education/api/get-admin-education-by-id';
import { getPaginatedAdminEducations } from '@/entities/education/api/get-paginated-admin-educations';
import { updateEducation } from '@/entities/education/api/update-education';
import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { educationKeys } from '@/entities/education/model/query-keys';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { useEditingRecord } from '@/shared/hooks/use-editing-record';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';
import { formatDate } from '@/shared/lib/utils';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function EducationManager() {
  const t = useTranslations('dashboard.education');
  const tShared = useTranslations('dashboard.shared');
  const locale = useLocale();
  const {
    items: educations,
    pagination,
    isLoading,
    isError,
    refetch,
    isFetching,
    isPlaceholderData,
    setPage,
    editing,
    isDialogOpen,
    onDialogOpenChange,
    openCreateDialog,
    openEditDialog,
    save,
    isSaving,
    itemToDelete: eduToDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    isDeletingItem,
  } = useCrudManager<AdminEducationListItem, EducationFormValues>({
    queryKey: educationKeys.adminList(),
    entityLabel: 'Education',
    messages: {
      created: t('toast.created'),
      updated: t('toast.updated'),
      deleted: t('toast.deleted'),
      saveError: t('toast.saveError'),
      deleteError: t('toast.deleteError'),
    },
    // Saving leaves `educationKeys.detail(id)` — the entry the editor below
    // loads — holding pre-save content that no list invalidation reaches.
    detailKey: (education) => educationKeys.detail(education.id),
    pageSize: ADMIN_PAGE_SIZE,
    pageKey: educationKeys.adminPage,
    fetchPage: (page, limit) => getPaginatedAdminEducations(page, limit),
    create: createEducation,
    update: updateEducation,
    remove: deleteEducation,
  });

  // The list row carries no achievements, so the dialog loads the full entry
  // by id; "New" (`editing` is null) fetches nothing and opens an empty form.
  const fullEducation = useEditingRecord({
    id: editing?.id ?? null,
    queryKey: educationKeys.detail,
    fetchRecord: getAdminEducationById,
  });

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Button onClick={openCreateDialog} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t('createButton')}
          </Button>
        }
      />

      <div className="relative min-h-[200px] space-y-4">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={educations.length === 0}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          emptyAction={
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              {t('emptyAction')}
            </Button>
          }
        >
          <div className="grid gap-4">
            {educations.map((edu) => {
              // Admin reads keep every locale ordered `language: 'asc'`, so
              // the first row is always English — resolve against the
              // dashboard's own locale instead.
              const title =
                getTranslatedContent(edu.translations, locale)?.title ||
                t('untitled');
              const dateRange = `${formatDate(edu.startDate)} — ${
                edu.endDate ? formatDate(edu.endDate) : t('present')
              }`;

              return (
                <div
                  key={edu.id}
                  className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {edu.logo?.url ? (
                        <Image
                          src={edu.logo.url}
                          alt={title}
                          fill
                          sizes="56px"
                          className="object-contain p-2"
                        />
                      ) : (
                        <GraduationCap className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h4 className="truncate font-semibold leading-none">
                        {title}
                      </h4>
                      <p className="text-xs font-medium text-muted-foreground">
                        {dateRange}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge
                          variant="secondary"
                          className="px-2 py-0 text-[10px]"
                        >
                          {t('achievementCount', {
                            count: edu._count.achievements,
                          })}
                        </Badge>

                        {!edu.endDate && (
                          <Badge
                            variant="outline"
                            className="px-2 py-0 text-[10px]"
                          >
                            {t('ongoing')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                    <EditButton
                      label={t('editLabel', { name: title })}
                      onClick={() => openEditDialog(edu)}
                    />
                    <DeleteButton
                      label={t('deleteLabel', { name: title })}
                      isSubmitting={isDeletingItem(edu)}
                      onClick={() => requestDelete(edu)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ManagerListState>
      </div>

      {educations.length > 0 && (
        <Pagination
          pagination={pagination}
          setPage={setPage}
          isPlaceholderData={isPlaceholderData}
          pageLabel={tShared('pagination.pageLabel', {
            page: pagination?.currentPage ?? 1,
            totalPages: pagination?.totalPages ?? 1,
          })}
          previousLabel={tShared('pagination.previous')}
          nextLabel={tShared('pagination.next')}
        />
      )}

      <EducationDialog
        key={editing?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={fullEducation.record}
        isLoadingInitialData={fullEducation.isNotReady}
        hasLoadError={fullEducation.hasError}
        onRetryLoad={fullEducation.retry}
        onSubmit={(values) => save(values)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!eduToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        description={t.rich('deleteDescription', {
          name: () => (
            <span className="font-medium text-foreground">
              {(eduToDelete &&
                getTranslatedContent(eduToDelete.translations, locale)
                  ?.title) ||
                t('untitled')}
            </span>
          ),
        })}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
