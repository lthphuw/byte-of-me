'use client';

import { Button, ConfirmDeleteDialog, Pagination } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TagDialog } from './tag-dialog';
import { TagListLoading } from './tag-list-loading';

import {
  type AdminTag,
  createTag,
  deleteTag,
  getPaginatedAdminTags,
  type TagFormValues,
  tagKeys,
  updateTag,
} from '@/entities/tag';
import { useAdminTagById } from '@/entities/tag/query';
import { TagCard } from '@/features/dashboard/tag-management';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function TagManager() {
  const t = useTranslations('dashboard.tag');
  const tShared = useTranslations('dashboard.shared');
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
    queryKey: tagKeys.adminList(),
    entityLabel: 'Tag',
    messages: {
      created: t('toast.created'),
      updated: t('toast.updated'),
      deleted: t('toast.deleted'),
      saveError: t('toast.saveError'),
      deleteError: t('toast.deleteError'),
    },
    // A save leaves `tagKeys.detail(id)`, the record the dialog loads, holding
    // pre-save content that no list invalidation reaches.
    detailKey: (tag) => tagKeys.detail(tag.id),
    pageSize: ADMIN_PAGE_SIZE,
    pageKey: tagKeys.adminPage,
    fetchPage: (page, limit) => getPaginatedAdminTags(page, limit),
    create: createTag,
    update: updateTag,
    remove: deleteTag,
  });

  // The list row is not the editor's source: the dialog loads the tag's full
  // record by id. "New" (`editing` is null) fetches nothing.
  const fullTag = useAdminTagById(editing?.id ?? null);

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {t('createButton')}
          </Button>
        }
      />

      <div className="relative min-h-[300px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={tags.length === 0}
          skeleton={<TagListLoading />}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={openCreateDialog}
            >
              {t('emptyAction')}
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tags.map((tag) => (
              <TagCard
                key={tag.id}
                tag={tag}
                onEdit={() => openEditDialog(tag)}
                onDelete={() => requestDelete(tag)}
                isDeleting={isDeletingItem(tag)}
              />
            ))}
          </div>
        </ManagerListState>
      </div>

      {pagination && tags.length > 0 && (
        <div className="pt-4">
          <Pagination
            pagination={pagination}
            setPage={setPage}
            isPlaceholderData={isPlaceholderData}
            pageLabel={tShared('pagination.pageLabel', {
              page: pagination.currentPage,
              totalPages: pagination.totalPages,
            })}
            previousLabel={tShared('pagination.previous')}
            nextLabel={tShared('pagination.next')}
          />
        </div>
      )}

      <TagDialog
        key={editing?.id || 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={fullTag.record}
        isLoadingInitialData={fullTag.isNotReady}
        hasLoadError={fullTag.hasError}
        onRetryLoad={fullTag.retry}
        onSubmit={(data) => save(data)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!itemToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        description={t.rich('deleteDescription', {
          name: () => (
            <span className="font-semibold text-foreground">
              "{itemToDelete?.slug}"
            </span>
          ),
        })}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
