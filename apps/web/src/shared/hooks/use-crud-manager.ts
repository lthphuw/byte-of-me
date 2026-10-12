'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useServerMutation } from './use-server-mutation';

import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export type CrudManagerOptions<TItem extends { id: string }, TSaveInput> = {
  /**
   * Query-key root from the entity's key factory (e.g. `blogKeys.adminList()`).
   * Every save and delete invalidates this root, so all pages refetch.
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
   * when the item is saved or deleted, forcing the next edit to re-fetch.
   */
  detailKey?: (item: TItem) => readonly unknown[];
  /**
   * Only `ADMIN_PAGE_SIZE`. The page key is built from the page number alone, so
   * another size would share its cache entry with the page the server prefetched.
   */
  pageSize?: typeof ADMIN_PAGE_SIZE;
  create: (values: TSaveInput) => Promise<ApiResponse<unknown>>;
  update: (id: string, values: TSaveInput) => Promise<ApiResponse<unknown>>;
  remove: (id: string) => Promise<ApiResponse<unknown>>;
} & (
  | {
      fetchPage: (
        page: number,
        limit: number
      ) => Promise<ApiResponse<PaginatedData<TItem>>>;
      /**
       * Key of one page: the entity's `adminPage`, so the server prefetch and
       * this hook call one factory. Required: a key built here could differ
       * from the prefetch and hydrate the wrong rows.
       */
      pageKey: (page: number) => readonly unknown[];
      fetchAll?: never;
      initialItems?: never;
    }
  | {
      /** Non-paginated lists (education, companies, tech stack). */
      fetchAll: () => Promise<ApiResponse<TItem[]>>;
      fetchPage?: never;
      pageKey?: never;
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
  pageSize = ADMIN_PAGE_SIZE,
  fetchPage,
  pageKey,
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

  // A paginated list always has a `pageKey` (the type requires it). A
  // non-paginated list keys on the root.
  const listKey = fetchPage && pageKey ? pageKey(page) : [...queryKey];

  const query = useQuery<ListResult>({
    queryKey: listKey,
    queryFn: async (): Promise<ListResult> => {
      if (fetchPage) return unwrapApiResponse(await fetchPage(page, pageSize));
      if (!fetchAll) {
        throw new Error('useCrudManager requires fetchPage or fetchAll');
      }
      return { data: unwrapApiResponse(await fetchAll()) };
    },
    placeholderData: (prev) => prev,
    initialData: initialItems ? { data: initialItems } : undefined,
  });

  type SaveInput = { values: TSaveInput; target: Nullable<TItem> };

  const saveMutation = useServerMutation<SaveInput, unknown>({
    mutationFn: ({ values, target }) =>
      target ? update(target.id, values) : create(values),
    errorMessage: messages
      ? messages.saveError
      : `Failed to save ${lowerLabel}`,
    invalidate: [queryKey],
    onSuccess: (_data, { target }) => {
      toast.success(
        messages
          ? target
            ? messages.updated
            : messages.created
          : target
          ? `${entityLabel} updated`
          : `${entityLabel} created`
      );
      closeDialog();
      // Removed rather than invalidated, and after `closeDialog` so the now
      // disabled observer does not refetch on the way out: an invalidated but
      // still-present entry would be handed to the editor for one render on
      // the next open, which is exactly the pre-save document we are dropping.
      if (target && detailKey) {
        queryClient.removeQueries({ queryKey: detailKey(target) });
      }
    },
  });

  const deleteMutation = useServerMutation<TItem, unknown>({
    mutationFn: (item) => remove(item.id),
    errorMessage: messages
      ? messages.deleteError
      : `Could not delete ${lowerLabel}`,
    invalidate: [queryKey],
    onSuccess: (_data, item) => {
      toast.success(messages ? messages.deleted : `${entityLabel} deleted`);
      // The same per-item cache as a save. The id cannot be reopened, but
      // its document would otherwise sit in memory until garbage collection.
      if (detailKey) queryClient.removeQueries({ queryKey: detailKey(item) });
      setItemToDelete(null);
    },
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
    onDialogOpenChange: (open: boolean) =>
      open ? setIsDialogOpen(true) : closeDialog(),
    openCreateDialog,
    openEditDialog,
    closeDialog,
    save: (values: TSaveInput) =>
      saveMutation.mutate({ values, target: editing }),
    isSaving: saveMutation.isPending,

    // Delete confirmation
    itemToDelete,
    requestDelete: (item: TItem) => setItemToDelete(item),
    cancelDelete: () => setItemToDelete(null),
    confirmDelete: () => itemToDelete && deleteMutation.mutate(itemToDelete),
    isDeleting: deleteMutation.isPending,
    /** True only for the item whose deletion is in flight. */
    isDeletingItem: (item: TItem) =>
      deleteMutation.isPending && itemToDelete?.id === item.id,
  };
}
