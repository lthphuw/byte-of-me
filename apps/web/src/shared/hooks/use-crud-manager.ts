'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error(res.errorMsg);
  return res.data;
}

export type CrudManagerOptions<TItem extends { id: string }, TSaveInput> = {
  /** Query-key root; page number is appended automatically. */
  queryKey: string;
  /** Human label used in toasts, e.g. 'Tag' → 'Tag created'. */
  entityLabel: string;
  pageSize?: number;
  fetchPage: (
    page: number,
    limit: number
  ) => Promise<ApiResponse<PaginatedData<TItem>>>;
  create: (values: TSaveInput) => Promise<ApiResponse<unknown>>;
  update: (id: string, values: TSaveInput) => Promise<ApiResponse<unknown>>;
  remove: (id: string) => Promise<ApiResponse<unknown>>;
};

/**
 * The standard dashboard manager flow:
 * load (placeholder-kept pagination, surfaced errors) → create/update via a
 * single dialog → delete via ConfirmDeleteDialog → sonner feedback on every
 * mutation outcome.
 */
export function useCrudManager<TItem extends { id: string }, TSaveInput>({
  queryKey,
  entityLabel,
  pageSize = 12,
  fetchPage,
  create,
  update,
  remove,
}: CrudManagerOptions<TItem, TSaveInput>) {
  const queryClient = useQueryClient();
  const lowerLabel = entityLabel.toLowerCase();

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Nullable<TItem>>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Nullable<TItem>>(null);

  const query = useQuery({
    queryKey: [queryKey, page],
    queryFn: async () => unwrap(await fetchPage(page, pageSize)),
    placeholderData: (prev) => prev,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: TSaveInput) =>
      unwrap(await (editing ? update(editing.id, values) : create(values))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(
        editing ? `${entityLabel} updated` : `${entityLabel} created`
      );
      closeDialog();
    },
    onError: () => toast.error(`Failed to save ${lowerLabel}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => unwrap(await remove(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(`${entityLabel} deleted`);
      setItemToDelete(null);
    },
    onError: () => toast.error(`Could not delete ${lowerLabel}`),
  });

  const openCreateDialog = () => {
    setEditing(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: TItem) => {
    setEditing(item);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditing(null);
  };

  return {
    // Data
    items: query.data?.data ?? [],
    pagination: query.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    page,
    setPage,

    // Editor dialog
    editing,
    isDialogOpen,
    /** For Dialog onOpenChange: closing clears the editing target. */
    onDialogOpenChange: (open: boolean) => (open ? setIsDialogOpen(true) : closeDialog()),
    openCreateDialog,
    openEditDialog,
    closeDialog,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,

    // Delete confirmation
    itemToDelete,
    requestDelete: (item: TItem) => setItemToDelete(item),
    cancelDelete: () => setItemToDelete(null),
    confirmDelete: () =>
      itemToDelete && deleteMutation.mutate(itemToDelete.id),
    isDeleting: deleteMutation.isPending,
    /** True only for the item whose deletion is in flight. */
    isDeletingItem: (item: TItem) =>
      deleteMutation.isPending && itemToDelete?.id === item.id,
  };
}
