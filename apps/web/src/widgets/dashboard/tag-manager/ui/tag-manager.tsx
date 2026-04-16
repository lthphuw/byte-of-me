'use client';

import { useState } from 'react';
import { createTag, deleteTag, updateTag } from '@/entities/tag';
import { getPaginatedAdminTags } from '@/entities/tag/api/get-paginated-admin-tags';
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
import { DeleteButton } from '@/shared/ui/delete-button';
import { EditButton } from '@/shared/ui/edit-button';
import { Empty, EmptyDescription, EmptyHeader } from '@/shared/ui/empty';
import Loading from '@/shared/ui/loading';
import { Pagination } from '@/shared/ui/pagination';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag as TagIcon } from 'lucide-react';
import { toast } from 'sonner';

import { TagDialog } from './tag-dialog';

export function TagManager() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<any>(null);

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['tags', page],
    queryFn: () => getPaginatedAdminTags(page, 12),
    placeholderData: (prev) => prev,
  });

  const tags = data?.data?.data || [];
  const pagination = data?.data?.meta;

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editing ? updateTag(editing.id, values) : createTag(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success(editing ? 'Tag updated' : 'Tag created');
      handleClose();
    },
    onError: () => toast.error('Failed to save tag'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag deleted');
      setTagToDelete(null);
    },
    onError: () => toast.error('Could not delete tag'),
  });

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (tag: any) => {
    setEditing(tag);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tags</h2>
          <p className="text-muted-foreground text-xs">
            Categorize your projects and posts
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Tag
        </Button>
      </div>

      <div className="relative min-h-[300px]">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loading />
            <p className="text-muted-foreground animate-pulse text-xs">
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
                onClick={() => setOpen(true)}
              >
                Create First Tag
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tags.map((tag: any) => (
              <div
                key={tag.id}
                className="bg-card hover:border-primary/50 group flex items-center justify-between rounded-xl border p-3 transition-all hover:shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
                    <TagIcon className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {tag.translations?.[0]?.name || tag.slug}
                    </p>
                    <p className="text-muted-foreground truncate font-mono text-[10px] uppercase tracking-tighter">
                      {tag.slug}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <EditButton onClick={() => handleEdit(tag)} />
                  <DeleteButton
                    isSubmitting={
                      deleteMutation.isPending && tagToDelete?.id === tag.id
                    }
                    onClick={() => setTagToDelete(tag)}
                  />
                </div>
              </div>
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
        key={editing?.id || 'new'}
        open={open}
        onOpenChange={(val: any) => !val && handleClose()}
        initialData={editing}
        onSubmit={(data: any) => saveMutation.mutate(data)}
        loading={saveMutation.isPending}
      />

      <AlertDialog
        open={!!tagToDelete}
        onOpenChange={() => setTagToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tag{' '}
              <span className="text-foreground font-semibold">
                "{tagToDelete?.slug}"
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(tagToDelete.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Tag'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
