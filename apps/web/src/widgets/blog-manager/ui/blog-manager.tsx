'use client';

import { useState } from 'react';
import { AdminBlog } from '@/entities/blog';
import { createBlog } from '@/entities/blog/api/create-blog';
import { deleteBlog } from '@/entities/blog/api/delete-blog';
import { getPaginatedAdminBlog } from '@/entities/blog/api/get-paginated-admin-blogs';
import { updateBlog } from '@/entities/blog/api/update-blog';
import { BlogFormValues } from '@/entities/blog/schemas/blog';
import { BlogEditorCard } from '@/entities/blog/ui/blog-editor-card';
import { PaginatedData } from '@/shared/types/api/paginated-api.type';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Empty, EmptyDescription, EmptyHeader } from '@/shared/ui/empty';
import Loading from '@/shared/ui/loading';
import { Pagination } from '@/shared/ui/pagination';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { BlogDialog } from './blog-dialog';

export interface BlogManagerProps {
  initData: PaginatedData<AdminBlog>;
}

export function BlogManager({ initData }: BlogManagerProps) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminBlog | null>(null);
  const [open, setOpen] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<string | null>(null);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['blogs', page],
    queryFn: () => getPaginatedAdminBlog(page, 12),
    initialData: {
      success: true,
      data: initData,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: BlogFormValues) =>
      editing ? updateBlog(editing.id, data) : createBlog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      setBlogToDelete(null);
    },
  });

  const blogs = data?.data?.data || [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Blogs</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Blog
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loading />
          </div>
        ) : blogs.length === 0 ? (
          <div className="col-span-full flex justify-center py-20">
            <Empty>
              <EmptyHeader>No blogs found</EmptyHeader>
              <EmptyDescription>Create your first blog.</EmptyDescription>
            </Empty>
          </div>
        ) : (
          blogs.map((blog) => (
            <BlogEditorCard
              key={blog.id}
              blog={blog}
              onEdit={(b) => {
                setEditing(b);
                setOpen(true);
              }}
              onDelete={(id) => setBlogToDelete(id)}
            />
          ))
        )}
      </div>

      <Pagination
        pagination={meta}
        setPage={setPage}
        isPlaceholderData={isPlaceholderData}
      />

      <BlogDialog
        open={open}
        onOpenChange={setOpen}
        initialData={editing!}
        onSubmit={(values) =>
          saveMutation.mutate({
            ...values,
            translations:
              values.translations?.map((t) => ({
                ...t,
                content: JSON.stringify(t.content),
              })) || [],
          })
        }
        loading={saveMutation.isPending}
      />

      <AlertDialog
        open={!!blogToDelete}
        onOpenChange={() => setBlogToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (blogToDelete) deleteMutation.mutate(blogToDelete);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
