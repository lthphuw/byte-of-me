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
  /**
   * Query-key root from the entity's key factory (e.g. `blogKeys.adminList()`);
   * the page number is appended automatically when paginated.
   */
  queryKey: readonly unknown[];
  /** Human label used in toasts, e.g. 'Tag' → 'Tag created'. */
  entityLabel: string;
  /**
   * Whole, pre-translated toast sentences (the i18n path). When supplied,
   * each string is used verbatim instead of concatenating `entityLabel`
   * onto an English verb phrase (the legacy, non-i18n fallback below).
   */
  messages?: {
    created: string;
    updated: string;
    deleted: string;
    saveError: string;
    deleteError: string;
  };
  /**
   * Key of a per-item cache the list query does not cover — e.g.
   * `blogKeys.detail(item.id)`, the full document the editor loads on demand.
   * That key is not a descendant of `queryKey`, so invalidating the list would
   * leave the pre-save document cached; supply this and the entry is dropped
   * when the item is saved, forcing the next edit to re-fetch.
   */
  detailKey?: (item: TItem) => readonly unknown[];
  pageSize?: number;
  create: (values: TSaveInput) => Promise<ApiResponse<unknown>>;
  update: (id: string, values: TSaveInput) => Promise<ApiResponse<unknown>>;
  remove: (id: string) => Promise<ApiResponse<unknown>>;
} & (
  | {
      fetchPage: (
        page: number,
        limit: number
      ) => Promise<ApiResponse<PaginatedData<TItem>>>;
      fetchAll?: never;
      initialItems?: never;
    }
  | {
      /** Non-paginated lists (education, companies, tech stack). */
      fetchAll: () => Promise<ApiResponse<TItem[]>>;
      fetchPage?: never;
      /** Server-rendered items to hydrate the first paint. */
      initialItems?: TItem[];
    }
);

/**
 * The standard dashboard manager flow:
 * load (placeholder-kept pagination, surfaced errors) → create/update via a
 * single dialog → delete via ConfirmDeleteDialog → sonner feedback on every
 * mutation outcome.
 */
export function useCrudManager<TItem extends { id: string }, TSaveInput>({
  queryKey,
  entityLabel,
  messages,
  detailKey,
  pageSize = 12,
  fetchPage,
  fetchAll,
  initialItems,
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

  type ListResult = { data: TItem[]; meta?: PaginatedData<TItem>['meta'] };

  const query = useQuery<ListResult>({
    queryKey: fetchPage ? [...queryKey, page] : [...queryKey],
    queryFn: async (): Promise<ListResult> => {
      if (fetchPage) return unwrap(await fetchPage(page, pageSize));
      if (!fetchAll) {
        throw new Error('useCrudManager requires fetchPage or fetchAll');
      }
      return { data: unwrap(await fetchAll()) };
    },
    placeholderData: (prev) => prev,
    initialData: initialItems ? { data: initialItems } : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: TSaveInput) =>
      unwrap(await (editing ? update(editing.id, values) : create(values))),
    onSuccess: () => {
      const saved = editing;
      queryClient.invalidateQueries({ queryKey });
      toast.success(
        messages
          ? saved
            ? messages.updated
            : messages.created
          : saved
            ? `${entityLabel} updated`
            : `${entityLabel} created`
      );
      closeDialog();
      // Removed rather than invalidated, and after `closeDialog` so the now
      // disabled observer does not refetch on the way out: an invalidated but
      // still-present entry would be handed to the editor for one render on
      // the next open, which is exactly the pre-save document we are dropping.
      if (saved && detailKey) {
        queryClient.removeQueries({ queryKey: detailKey(saved) });
      }
    },
    onError: () =>
      toast.error(messages ? messages.saveError : `Failed to save ${lowerLabel}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => unwrap(await remove(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(messages ? messages.deleted : `${entityLabel} deleted`);
      setItemToDelete(null);
    },
    onError: () =>
      toast.error(messages ? messages.deleteError : `Could not delete ${lowerLabel}`),
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
