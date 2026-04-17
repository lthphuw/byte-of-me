'use client';

import { Plus } from 'lucide-react';

import { TagDialog } from './tag-dialog';

import type { AdminTag } from '@/entities';
import { TagCard, useTagManagement } from '@/features/dashboard';
import { Button } from '@/shared/ui/button';
import { ConfirmDeleteDialog } from '@/shared/ui/confirm-delete-dialog';
import { Empty, EmptyDescription, EmptyHeader } from '@/shared/ui/empty';
import Loading from '@/shared/ui/loading';
import { Pagination } from '@/shared/ui/pagination';

export function TagManager() {
  const {
    tags,
    pagination,
    isLoading,
    isFetching,
    isPlaceholderData,
    setPage,
    editingTag,
    isDialogOpen,
    setIsDialogOpen,
    tagToDelete,
    setTagToDelete,
    actions,
  } = useTagManagement();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create New Tag
        </Button>
      </div>

      <div className="relative min-h-[300px]">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loading />

            <p className="animate-pulse text-xs text-muted-foreground">
              Fetching tags...
            </p>
          </div>
        ) : tags.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed">
            <Empty className="max-w-md">
              <EmptyHeader>No tags found</EmptyHeader>
              <EmptyDescription>
                Create tags to organize your content library.
              </EmptyDescription>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                Create First Tag
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tags.map((tag: AdminTag) => (
              <TagCard
                tag={tag}
                onEdit={() => actions.openEditDialog(tag)}
                onDelete={() => setTagToDelete(tag)}
                isDeleting={actions.isDeleting}
              />
            ))}
          </div>
        )}

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
        key={editingTag?.id || 'new'}
        open={isDialogOpen}
        onOpenChange={(val: Any) => !val && actions.closeDialog()}
        initialData={editingTag}
        onSubmit={(data: Any) => actions.handleSave(data)}
        loading={actions.isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!tagToDelete}
        isLoading={actions.isDeleting}
        onClose={() => setTagToDelete(null)}
        onConfirm={actions.handleDelete}
        title="Delete Tag"
        description={
          <>
            This will permanently delete the tag{' '}
            <span className="font-semibold text-foreground">
              "{tagToDelete?.slug}"
            </span>
            . This action cannot be undone.
          </>
        }
      />
    </div>
  );
}
