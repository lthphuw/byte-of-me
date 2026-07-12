'use client';

import { Button, ConfirmDeleteDialog, Loading, Pagination } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';

import { TagDialog } from './tag-dialog';

import type { AdminTag } from '@/entities';
import {
  createTag,
  deleteTag,
  getPaginatedAdminTags,
  type TagFormValues,
  updateTag,
} from '@/entities/tag';
import { TagCard } from '@/features/dashboard';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function TagManager() {
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
  } = useCrudManager<AdminTag, TagFormValues>({
    queryKey: CACHE_TAGS.TAG,
    entityLabel: 'Tag',
    pageSize: 12,
    fetchPage: (page, limit) => getPaginatedAdminTags(page, limit),
    create: createTag,
    update: updateTag,
    remove: deleteTag,
  });

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title="Tags"
        description="Create and manage custom taxonomies to categorize your content."
        action={
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create New Tag
          </Button>
        }
      />

      <div className="relative min-h-[300px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isEmpty={tags.length === 0}
          emptyTitle="No tags found"
          emptyDescription="Create tags to organize your content library."
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={openCreateDialog}
            >
              Create First Tag
            </Button>
          }
          skeleton={
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loading />

              <p className="animate-pulse text-xs text-muted-foreground">
                Fetching tags...
              </p>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tags.map((tag) => (
              <TagCard
                key={tag.id}
                tag={tag}
                onEdit={() => openEditDialog(tag)}
                onDelete={() => requestDelete(tag)}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        </ManagerListState>

        {!isLoading && isFetching && (
          <div className="absolute -top-12 right-0">
            <Loading />
          </div>
        )}
      </div>

      {pagination && tags.length > 0 && (
        <div className="pt-4">
          <Pagination
            pagination={pagination}
            setPage={setPage}
            isPlaceholderData={isPlaceholderData}
          />
        </div>
      )}

      <TagDialog
        key={editing?.id || 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={editing}
        onSubmit={(data) => save(data)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!itemToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Tag"
        description={
          <>
            This will permanently delete the tag{' '}
            <span className="font-semibold text-foreground">
              "{itemToDelete?.slug}"
            </span>
            . This action cannot be undone.
          </>
        }
      />
    </div>
  );
}
