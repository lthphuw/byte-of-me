'use client';

import { Button, ConfirmDeleteDialog, Pagination } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BlogListLoading } from './blog-list-loading';

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
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function BlogManager() {
  const t = useTranslations('dashboard.blog');
  const tShared = useTranslations('dashboard.shared');
  const {
    items: blogs,
    pagination,
    isLoading,
    isError,
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
    queryKey: blogKeys.adminList(),
    entityLabel: 'Blog',
    messages: {
      created: t('toast.created'),
      updated: t('toast.updated'),
      deleted: t('toast.deleted'),
      saveError: t('toast.saveError'),
      deleteError: t('toast.deleteError'),
    },
    // Saving a post leaves `blogKeys.detail(id)` — the document the editor
    // below loads — holding pre-save content that no list invalidation reaches.
    detailKey: (blog) => blogKeys.detail(blog.id),
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
    <Button size="sm" onClick={openCreateDialog}>
      <Plus className="mr-2 h-4 w-4" />
      {t('createButton')}
    </Button>
  );

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={newBlogButton}
      />

      <ManagerListState
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        skeleton={<BlogListLoading />}
        isEmpty={blogs.length === 0}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDescription')}
        emptyAction={newBlogButton}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {blogs.map((blog) => (
            <BlogEditorCard
              key={blog.id}
              blog={blog}
              onEdit={openEditDialog}
              onDelete={() => requestDelete(blog)}
              isPending={isDeletingItem(blog)}
            />
          ))}
        </div>
      </ManagerListState>

      {blogs.length > 0 && (
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

      <BlogEditorDialog
        key={editing?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={fullBlog.record}
        isLoadingInitialData={fullBlog.isNotReady}
        loadError={fullBlog.hasError ? t('loadError') : null}
        onRetryLoad={fullBlog.retry}
        onSubmit={(values) =>
          save({
            ...values,
            translations:
              values.translations?.map((t) => ({
                ...t,
                content: JSON.stringify(t.content),
              })) || [],
          })
        }
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!itemToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        description={t('deleteDescription')}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
