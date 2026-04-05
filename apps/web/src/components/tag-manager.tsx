'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { createTag } from '@/lib/actions/dashboard/tag/create-tag';
import { deleteTag } from '@/lib/actions/dashboard/tag/delete-tag';
import { getPaginatedTags } from '@/lib/actions/dashboard/tag/get-paginated-tags';
import { updateTag } from '@/lib/actions/dashboard/tag/update-tag';
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
import Loading from '@/components/loading';
import { Pagination } from '@/components/pagination';

import { TagDialog } from './tag-dialog';

export function TagManager() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['tags', page],
    queryFn: () => getPaginatedTags(page, 12),
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
        editing ? 'Tag updated successfully' : 'Tag created successfully'
      );
      handleClose(); // Reset state properly
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
          <Plus className="w-4 h-4 mr-2" />
          Add Tag
        </Button>
      </div>

      {/* Improved Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
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
              className="border rounded-lg p-3 flex justify-between items-center bg-card shadow-sm hover:shadow-md transition-shadow h-16"
            >
              <div className="min-w-0 flex-1 mr-2">
                <p className="font-medium text-sm truncate">
                  {tag.translations?.[0]?.name || tag.slug}
                </p>
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">
                  {tag.slug}
                </p>
              </div>

              <div className="flex gap-0.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditing(tag);
                    setOpen(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => setTagToDelete(tag.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
