'use client';

import { type TagFormValues, tagKeys } from '@byte-of-me/contracts/tag';
import { Button } from '@byte-of-me/ui';
import { useLocale, useTranslations } from 'next-intl';

import { TagDialog } from './tag-dialog';

import {
  type AdminTag,
  createTag,
  deleteTag,
  getPaginatedAdminTags,
  tagDisplayName,
  updateTag,
} from '@/entities/tag';
import { useAdminTagById } from '@/entities/tag/query';
import { TagCard } from '@/features/dashboard/tag-management';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import {
  AddButton,
  ConfirmDeleteDialog,
  ManagerListState,
  ManagerPageHeader,
  ManagerPagination,
  RecordListSkeleton,
} from '@/shared/ui';

export function TagManager() {
  const t = useTranslations('dashboard.tag');
  const crud = useTranslations('dashboard.shared.crud');
  const locale = useLocale();
  const entity = t('entity');
  const {
    items: tags,
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
    itemToDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    isDeletingItem,
  } = useCrudManager<AdminTag, TagFormValues>({
    entity,
    // Every tag key is refreshed on save: lists, picker options, the chip row
    // and the detail. Public blogs are refreshed on the server (TAG_MUTATION_TAGS).
    keys: { all: tagKeys.all, detail: tagKeys.detail },
    fetchPage: (page, limit) => getPaginatedAdminTags(page, limit),
    pageKey: tagKeys.adminPage,
    create: createTag,
    update: updateTag,
    remove: deleteTag,
  });

  // The list row is not the editor's source: the dialog loads the tag's full
  // record by id. "New" (`editing` is null) fetches nothing.
  const fullTag = useAdminTagById(editing?.id ?? null);

  const createButton = (
    <AddButton label={t('createButton')} onClick={openCreateDialog} />
  );

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={createButton}
      />

      {/* `relative` so ManagerListState's refetch spinner lands on the list. */}
      <div className="relative min-h-[300px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          skeleton={<RecordListSkeleton variant="grid" />}
          isEmpty={tags.length === 0}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              className="mt-4 min-h-11 can-hover:min-h-9"
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
            />
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tags.map((tag) => (
              <TagCard
                key={tag.id}
                tag={tag}
                onEdit={openEditDialog}
                onDelete={requestDelete}
                isDeleting={isDeletingItem(tag)}
              />
            ))}
          </div>
        </ManagerListState>
      </div>

      <TagDialog
        key={editing?.id || 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        isEditing={Boolean(editing)}
        initialData={fullTag.record}
        isLoadingInitialData={fullTag.isNotReady}
        hasLoadError={fullTag.hasError}
        onRetryLoad={fullTag.retry}
        loading={isSaving}
        onSubmit={save}
      />

      <ConfirmDeleteDialog
        open={!!itemToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={crud('deleteTitle', { entity })}
        description={crud('deleteDescription', {
          name: itemToDelete ? tagDisplayName(itemToDelete, locale) : '',
        })}
      />
    </div>
  );
}
