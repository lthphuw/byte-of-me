'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { PaginatedData } from '@/types/api/paginated.type';
import { createBlog } from '@/lib/actions/dashboard/blog/create-blog';
import { deleteBlog } from '@/lib/actions/dashboard/blog/delete-blog';
import {
  BlogDetails,
  getPaginatedBlog,
} from '@/lib/actions/dashboard/blog/get-paginated-blogs';
import { updateBlog } from '@/lib/actions/dashboard/blog/update-blog';
import { BlogFormValues } from '@/lib/schemas/blog.schema';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { BlogEditorCard } from '@/components/blog-editor-card';
import Loading from '@/components/loading';
import { Pagination } from '@/components/pagination';

import { BlogDialog } from './blog-dialog';

export interface BlogManagerProps {
  initData: PaginatedData<BlogDetails>;
}

export function BlogManager({ initData }: BlogManagerProps) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<BlogDetails | null>(null);
  const [open, setOpen] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<string | null>(null);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['blogs', page],
    queryFn: () => getPaginatedBlog(page, 12),
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
