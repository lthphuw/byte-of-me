'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  type AdminTag,
  createTag,
  deleteTag,
  getPaginatedAdminTags,
  type TagFormValues,
  updateTag,
} from '@/entities/tag';
import { CACHE_TAGS } from '@/shared/lib/constants';

export function useTagManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editingTag, setEditingTag] = useState<Nullable<AdminTag>>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Nullable<AdminTag>>(null);

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: [CACHE_TAGS.TAG, page],
    queryFn: () => getPaginatedAdminTags(page, 12),
    placeholderData: (prev) => prev,
  });

  const saveMutation = useMutation({
    mutationFn: (values: TagFormValues) =>
      editingTag ? updateTag(editingTag.id, values) : createTag(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_TAGS.TAG] });
      toast.success(editingTag ? 'Tag updated' : 'Tag created');
      closeDialog();
    },
    onError: () => toast.error('Failed to save tag'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_TAGS.TAG] });
      toast.success('Tag deleted');
      setTagToDelete(null);
    },
    onError: () => toast.error('Could not delete tag'),
  });

  const openEditDialog = (tag: AdminTag) => {
    setEditingTag(tag);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTag(null);
  };

  return {
    // State
    tags: data?.data?.data || [],
    pagination: data?.data?.meta,
    isLoading,
    isFetching,
    isPlaceholderData,
    page,
    setPage,

    // Dialog/Mutation State
    editingTag,
    isDialogOpen,
    setIsDialogOpen,
    tagToDelete,
    setTagToDelete,

    // Actions
    actions: {
      openEditDialog,
      closeDialog,
      handleSave: saveMutation.mutate,
      handleDelete: () => tagToDelete && deleteMutation.mutate(tagToDelete.id),
      isSaving: saveMutation.isPending,
      isDeleting: deleteMutation.isPending,
    },
  };
}
