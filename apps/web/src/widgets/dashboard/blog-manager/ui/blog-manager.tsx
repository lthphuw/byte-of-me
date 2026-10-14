'use client';

import { useTranslations } from 'next-intl';

import {
  type AdminBlogListItem,
  createBlog,
  deleteBlog,
  getPaginatedAdminBlogs,
  updateBlog,
} from '@/entities/blog';
import type { BlogFormValues } from '@/entities/blog/model/blog-schema';
import { blogKeys } from '@/entities/blog/model/query-keys';
import { blogQueries, useAdminBlogById } from '@/entities/blog/query';
import { BlogEditorCard } from '@/entities/blog/ui/blog-editor-card';
import { BlogEditorDialog } from '@/features/dashboard/blog-editor';
import { useBlogReferenceOptions } from '@/features/dashboard/blog-editor/lib/use-blog-reference-options';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import {
  AddButton,
  ConfirmDeleteDialog,
  ManagerListState,
  ManagerPageHeader,
  ManagerPagination,
  RecordListSkeleton,
} from '@/shared/ui';

export function BlogManager() {
  const t = useTranslations('dashboard.blog');
  const crud = useTranslations('dashboard.shared.crud');
  const entity = t('entity');
  const {
    items: blogs,
    pagination,
    isLoading,
    isError,
    isFetching,
    refetch,
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
  } = useCrudManager<AdminBlogListItem, BlogFormValues>({
    entity,
    // Every blog key is refreshed, the public lists included. The per-post
    // detail is dropped on save and delete.
    keys: { all: blogKeys.all, detail: blogKeys.detail },
    fetchPage: (page, limit) => getPaginatedAdminBlogs(page, limit),
    pageKey: (page) => blogQueries.adminPage(page).queryKey,
    create: createBlog,
    update: updateBlog,
    remove: deleteBlog,
  });

  // The list row never carries `content` (see AdminBlogListItem), so the
  // editor dialog loads the full post by id. "New Blog" (`editing` is null)
  // fetches nothing and opens an empty form.
  const fullBlog = useAdminBlogById(editing?.id);

  // Starts the pickers' fetches with the dialog instead of after the post
  // above resolves (the form mounts only then); the form reads the same keys.
  useBlogReferenceOptions(isDialogOpen);

  const newBlogButton = (
    <AddButton label={t('createButton')} onClick={openCreateDialog} />
  );

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={newBlogButton}
      />

      {/* `relative` so ManagerListState's background-refetch spinner lands on the list. */}
      <div className="relative">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          isFetching={isFetching}
          onRetry={() => refetch()}
          skeleton={<RecordListSkeleton variant="grid" />}
          isEmpty={blogs.length === 0}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          emptyAction={newBlogButton}
          pagination={
            <ManagerPagination
              pagination={pagination}
              setPage={setPage}
              isPlaceholderData={isPlaceholderData}
            />
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {blogs.map((blog) => (
              <BlogEditorCard
                key={blog.id}
                blog={blog}
                onEdit={() => openEditDialog(blog)}
                onDelete={() => requestDelete(blog)}
                isPending={isDeletingItem(blog)}
              />
            ))}
          </div>
        </ManagerListState>
      </div>

      <BlogEditorDialog
        key={editing?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={fullBlog.record}
        isNotReady={fullBlog.isNotReady}
        hasError={fullBlog.hasError}
        onRetry={fullBlog.retry}
        isPending={isSaving}
        onSubmit={save}
      />

      <ConfirmDeleteDialog
        open={!!itemToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={crud('deleteTitle', { entity })}
        description={crud('deleteDescription', {
          name:
            itemToDelete?.translations?.[0]?.title || itemToDelete?.slug || '',
        })}
      />
    </div>
  );
}
