'use client';

import { Button, ConfirmDeleteDialog, Pagination } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';

import {
  type AdminBlog,
  createBlog,
  deleteBlog,
  getPaginatedAdminBlogs,
  updateBlog,
} from '@/entities';
import type { BlogFormValues } from '@/entities/blog/model/blog-schema';
import { BlogEditorCard } from '@/entities/blog/ui/blog-editor-card';
import { BlogEditorDialog } from '@/features/dashboard';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function BlogManager() {
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
  } = useCrudManager<AdminBlog, BlogFormValues>({
    queryKey: 'blogs',
    entityLabel: 'Blog',
    pageSize: 12,
    fetchPage: (page, limit) => getPaginatedAdminBlogs(page, limit),
    create: createBlog,
    update: updateBlog,
    remove: deleteBlog,
  });

  const newBlogButton = (
    <Button size="sm" onClick={openCreateDialog}>
      <Plus className="mr-2 h-4 w-4" />
      New Blog
    </Button>
  );

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title="Blog Posts"
        description="Create and manage your articles, drafts, and published content."
        action={newBlogButton}
      />

      <ManagerListState
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        isEmpty={blogs.length === 0}
        emptyTitle="No blogs found"
        emptyDescription="Create your first blog."
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
        />
      )}

      <BlogEditorDialog
        key={editing?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={editing}
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
        title="Delete Blog?"
        description="This action cannot be undone."
      />
    </div>
  );
}
