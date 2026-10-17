'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse, PaginatedData } from '@byte-of-me/api-core';
import { unwrapApiResponse } from '@byte-of-me/api-core';
import { ADMIN_PAGE_SIZE, useServerMutation } from '@byte-of-me/query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

/** An entity's key factory: `all` covers every list, `detail(id)` one record. */
export interface CrudKeys {
  all: readonly unknown[];
  detail: (id: string) => readonly unknown[];
}

export type CrudSaveOptions = {
  /** Runs only after the save succeeds. */
  onSaved?: () => void;
};

export type CrudManagerOptions<TItem extends { id: string }, TSaveInput> = {
  /**
   * Only `ADMIN_PAGE_SIZE`. The page key is built from the page number alone, so
   * another size would share its cache entry with the page the server prefetched.
   */
  pageSize?: typeof ADMIN_PAGE_SIZE;
  /** Translated noun the toasts name, e.g. the entity's `…entity` key. */
  entity: string;
  /**
   * Every save and delete invalidates `keys.all`. `keys.detail(id)` is outside
   * it, so a list invalidation misses it and the hook drops it directly.
   */
  keys: CrudKeys;
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
export function useCrudManager<TItem extends { id: string }, TSaveInput>(
  options: CrudManagerOptions<TItem, TSaveInput>
) {
  const {
    entity,
    keys,
    pageSize = ADMIN_PAGE_SIZE,
    fetchPage,
    pageKey,
    fetchAll,
    initialItems,
    create,
    update,
    remove,
  } = options;
  const queryClient = useQueryClient();
  const crud = useTranslations('dashboard.shared.crud');
  const text = {
    created: crud('created', { entity }),
    updated: crud('updated', { entity }),
    deleted: crud('deleted', { entity }),
    saveError: crud('saveError', { entity }),
    deleteError: crud('deleteError', { entity }),
  };

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Nullable<TItem>>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Nullable<TItem>>(null);

  type ListResult = { data: TItem[]; meta?: PaginatedData<TItem>['meta'] };

  // A paginated list always has a `pageKey` (the type requires it). A
  // non-paginated list keys on the root.
  const listKey = fetchPage && pageKey ? pageKey(page) : [...keys.all];

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

  // The last row of the last page was deleted: step back to the new last page.
  // Placeholder data is skipped, because it describes the page being left.
  const totalPages = query.data?.meta?.totalPages;
  useEffect(() => {
    if (totalPages === undefined || query.isPlaceholderData) return;
    const lastPage = Math.max(1, totalPages);
    if (page > lastPage) setPage(lastPage);
  }, [page, query.isPlaceholderData, totalPages]);

  type SaveInput = {
    values: TSaveInput;
    target: Nullable<TItem>;
    onSaved?: () => void;
  };

  const saveMutation = useServerMutation<SaveInput, unknown>({
    mutationFn: ({ values, target }) =>
      target ? update(target.id, values) : create(values),
    errorMessage: text.saveError,
    invalidate: [keys.all],
    onSuccess: (_data, { target, onSaved }) => {
      toast.success(target ? text.updated : text.created);
      closeDialog();
      // Remove, don't invalidate, and only after closeDialog: an invalidated entry
      // would show the pre-save record for one render on the next open.
      if (target) {
        queryClient.removeQueries({ queryKey: keys.detail(target.id) });
      }
      onSaved?.();
    },
  });

  const deleteMutation = useServerMutation<TItem, unknown>({
    mutationFn: (item) => remove(item.id),
    errorMessage: text.deleteError,
    invalidate: [keys.all],
    onSuccess: (_data, item) => {
      toast.success(text.deleted);
      // The same per-item cache as a save: the id cannot be reopened, but its
      // document would otherwise sit in memory until garbage collection.
      queryClient.removeQueries({ queryKey: keys.detail(item.id) });
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
    /**
     * `options` is optional: react-hook-form's handleSubmit also passes the form
     * event as the second argument, and that event has no `onSaved`.
     */
    save: (values: TSaveInput, options?: CrudSaveOptions) =>
      saveMutation.mutate({
        values,
        target: editing,
        onSaved: options?.onSaved,
      }),
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
