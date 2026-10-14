'use client';

import { Badge, Button } from '@byte-of-me/ui';
import { GraduationCap, Plus } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { EducationDialog } from './education-dialog';

import { createEducation } from '@/entities/education/api/create-education';
import { deleteEducation } from '@/entities/education/api/delete-education';
import { getPaginatedAdminEducations } from '@/entities/education/api/get-paginated-admin-educations';
import { updateEducation } from '@/entities/education/api/update-education';
import {
  type AdminEducationListItem,
  type EducationFormValues,
  educationKeys,
} from '@/entities/education/model';
import {
  educationQueries,
  useAdminEducationById,
} from '@/entities/education/query';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { formatDate } from '@/shared/lib/utils';
import {
  ConfirmDeleteDialog,
  ManagerListState,
  ManagerPageHeader,
  ManagerPagination,
  RecordListItem,
  RecordRowActions,
} from '@/shared/ui';

export function EducationManager() {
  const t = useTranslations('dashboard.education');
  const tCrud = useTranslations('dashboard.shared.crud');
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
    entity: t('entity'),
    keys: { all: educationKeys.all, detail: educationKeys.detail },
    pageKey: (page) => educationQueries.adminPage(page).queryKey,
    fetchPage: getPaginatedAdminEducations,
    create: createEducation,
    update: updateEducation,
    remove: deleteEducation,
  });

  // The list row carries no achievements, so the dialog loads the full entry
  // by id; "New" (`editing` is null) fetches nothing and opens an empty form.
  const fullEducation = useAdminEducationById(editing?.id);

  // Admin reads order each entry's translations by language, so the first one
  // is not the viewer's: resolve against the dashboard's own locale.
  const titleOf = (edu: AdminEducationListItem) =>
    getTranslatedContent(edu.translations, locale)?.title || t('untitled');


  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Button
            onClick={openCreateDialog}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('createButton')}
          </Button>
        }
      />

      <div className="relative min-h-[200px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={educations.length === 0}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              onClick={openCreateDialog}
            >
              {t('emptyAction')}
            </Button>
          }
          pagination={
            <ManagerPagination
              pagination={pagination}
              setPage={setPage}
              isPlaceholderData={isPlaceholderData}
              className="mt-6"
            />
          }
        >
          <div className="space-y-3">
            {educations.map((edu) => {
              const title = titleOf(edu);
              const dateRange = `${formatDate(edu.startDate, locale)} — ${
                edu.endDate ? formatDate(edu.endDate, locale) : t('present')
              }`;

              return (
                <RecordListItem
                  key={edu.id}
                  leading={
                    <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-muted">
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
                  }
                  actions={
                    <RecordRowActions
                      name={title}
                      onEdit={() => openEditDialog(edu)}
                      onDelete={() => requestDelete(edu)}
                      disabled={isDeletingItem(edu)}
                    />
                  }
                >
                  <h4 className="truncate font-semibold leading-none">
                    {title}
                  </h4>
                  <p className="truncate pt-1 text-xs font-medium text-muted-foreground">
                    {dateRange}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge
                      variant="secondary"
                      className="px-2 py-0 text-[10px]"
                    >
                      {t('achievementCount', {
                        count: edu._count.achievements,
                      })}
                    </Badge>

                    {!edu.endDate && (
                      <Badge variant="outline" className="px-2 py-0 text-[10px]">
                        {t('ongoing')}
                      </Badge>
                    )}
                  </div>
                </RecordListItem>
              );
            })}
          </div>
        </ManagerListState>
      </div>

      <EducationDialog
        key={editing?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        isEditing={Boolean(editing)}
        initialData={fullEducation.record}
        isLoadingInitialData={fullEducation.isNotReady}
        hasLoadError={fullEducation.hasError}
        onRetryLoad={fullEducation.retry}
        onSubmit={(values) => save(values)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        open={!!eduToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={tCrud('deleteTitle', { entity: t('entity') })}
        description={tCrud('deleteDescription', {
          name: eduToDelete ? titleOf(eduToDelete) : '',
        })}
      />
    </div>
  );
}
