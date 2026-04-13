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
import { Empty, EmptyDescription, EmptyHeader } from '@/shared/ui/empty';
import Loading from '@/shared/ui/loading';
import { Pagination } from '@/shared/ui/pagination';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { TagDialog } from './tag-dialog';

export function TagManager() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['tags', page],
    queryFn: () => getPaginatedAdminTags(page, 12),
    placeholderData: (previousData) => previousData,
  });

  const tags = data?.data?.data || [];
  const pagination = data?.data?.meta;

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editing ? updateTag(editing.id, values) : createTag(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success(
        editing
          ? 'PublicTag updated successfully'
          : 'PublicTag created successfully'
      );
      handleClose(); // Reset state properly
    },
    onError: () => toast.error('Failed to save tagSchema'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('PublicTag deleted');
      setTagToDelete(null);
    },
    onError: () => toast.error('Could not delete tagSchema'),
  });

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tags</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Tag
        </Button>
      </div>

      {/* Improved Grid Layout */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-20">
            <Loading />
          </div>
        ) : tags.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-20">
            <Empty className="max-w-md text-center">
              <EmptyHeader>No tags found</EmptyHeader>
              <EmptyDescription>
                Create your first tag to get started.
              </EmptyDescription>
            </Empty>
          </div>
        ) : (
          tags.map((tag: any) => (
            <div
              key={tag.id}
              className="bg-card flex h-16 items-center justify-between rounded-lg border p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mr-2 min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {tag.translations?.[0]?.name || tag.slug}
                </p>
                <p className="text-muted-foreground truncate text-[10px] uppercase tracking-wider">
                  {tag.slug}
                </p>
              </div>

              <div className="flex shrink-0 gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditing(tag);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 h-8 w-8"
                  onClick={() => setTagToDelete(tag.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination
        pagination={pagination}
        setPage={setPage}
        isPlaceholderData={isPlaceholderData}
      />

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
            <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
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
                if (tagToDelete) deleteMutation.mutate(tagToDelete);
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
