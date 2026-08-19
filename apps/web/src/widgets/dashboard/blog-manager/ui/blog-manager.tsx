'use client';

import { Button, ConfirmDeleteDialog, Pagination } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  type AdminBlogListItem,
  createBlog,
  deleteBlog,
  getAdminBlogById,
  getPaginatedAdminBlogs,
  updateBlog,
} from '@/entities/blog';
import type { BlogFormValues } from '@/entities/blog/model/blog-schema';
import { blogKeys } from '@/entities/blog/model/query-keys';
import { BlogEditorCard } from '@/entities/blog/ui/blog-editor-card';
import { BlogEditorDialog } from '@/features/dashboard/blog-editor';
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
    pageSize: 12,
    fetchPage: (page, limit) => getPaginatedAdminBlogs(page, limit),
    create: createBlog,
    update: updateBlog,
    remove: deleteBlog,
  });

  // The list row never carries `content` (see AdminBlogListItem), so the
  // editor dialog needs the full post fetched separately. Disabled entirely
  // for "New Blog" (`editing` is null there) — no id, no fetch, empty form.
  const editingBlogQuery = useQuery({
    queryKey: blogKeys.detail(editing?.id ?? ''),
    queryFn: () => getAdminBlogById(editing?.id ?? ''),
    enabled: Boolean(editing),
  });

  const editingBlogResult = editing ? editingBlogQuery.data : undefined;
  const fullEditingBlog =
    editingBlogResult?.success ? editingBlogResult.data : null;
  // "Not ready" covers both still-loading and a failed fetch — either way
  // `fullEditingBlog` stays null, and the dialog must not fall through to
  // mounting the form on a null/partial row.
  const isEditingBlogNotReady = Boolean(editing) && !fullEditingBlog;
  const editingBlogLoadError = editing
    ? editingBlogResult && !editingBlogResult.success
      ? editingBlogResult.errorMsg
      : editingBlogQuery.isError
        ? t('loadError')
        : null
    : null;

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
        initialData={fullEditingBlog}
        isLoadingInitialData={isEditingBlogNotReady}
        loadError={editingBlogLoadError}
        onRetryLoad={() => editingBlogQuery.refetch()}
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
