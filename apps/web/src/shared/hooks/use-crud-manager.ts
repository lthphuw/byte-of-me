'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useServerMutation } from './use-server-mutation';

import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

/** An entity's key factory: `all` covers every list, `detail(id)` one record. */
export interface CrudKeys {
  all: readonly unknown[];
  detail: (id: string) => readonly unknown[];
}

type CrudToastText = {
  created: string;
  updated: string;
  deleted: string;
  saveError: string;
  deleteError: string;
};

/**
 * `entity` and `keys` are the contract. The legacy branch serves callers not
 * yet migrated; it goes once every caller passes `entity` and `keys`.
 */
type CrudIdentity<TItem extends { id: string }> =
  | {
      /** Translated noun the toasts name, e.g. the entity's `…entity` key. */
      entity: string;
      keys: CrudKeys;
      queryKey?: never;
      entityLabel?: never;
      messages?: never;
      detailKey?: never;
    }
  | {
      /**
       * Query-key root from the entity's key factory (e.g. `blogKeys.adminList()`).
       * Every save and delete invalidates this root, so all pages refetch.
       */
      queryKey: readonly unknown[];
      /** English noun for the fallback toasts, e.g. 'Tag' → 'Tag created'. */
      entityLabel: string;
      /** Pre-translated toast sentences, used verbatim (the legacy i18n path). */
      messages?: CrudToastText;
      /**
       * A per-item cache the list does not cover, e.g. `blogKeys.detail(id)`: it
       * is not under `queryKey`, so a list invalidation misses it. Dropped on save and delete.
       */
      detailKey?: (item: TItem) => readonly unknown[];
      entity?: never;
      keys?: never;
    };

export type CrudManagerOptions<TItem extends { id: string }, TSaveInput> = {
  /**
   * Only `ADMIN_PAGE_SIZE`. The page key is built from the page number alone, so
   * another size would share its cache entry with the page the server prefetched.
   */
  pageSize?: typeof ADMIN_PAGE_SIZE;
  create: (values: TSaveInput) => Promise<ApiResponse<unknown>>;
  update: (id: string, values: TSaveInput) => Promise<ApiResponse<unknown>>;
  remove: (id: string) => Promise<ApiResponse<unknown>>;
} & CrudIdentity<TItem> &
  (
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

/** English fallbacks for the legacy callers. Removed with them. */
function legacyToastText(entityLabel: string): CrudToastText {
  const lower = entityLabel.toLowerCase();

  return {
    created: `${entityLabel} created`,
    updated: `${entityLabel} updated`,
    deleted: `${entityLabel} deleted`,
    saveError: `Failed to save ${lower}`,
    deleteError: `Could not delete ${lower}`,
  };
}

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

  const text: CrudToastText = options.keys
    ? {
        created: crud('created', { entity: options.entity }),
        updated: crud('updated', { entity: options.entity }),
        deleted: crud('deleted', { entity: options.entity }),
        saveError: crud('saveError', { entity: options.entity }),
        deleteError: crud('deleteError', { entity: options.entity }),
      }
    : options.messages ?? legacyToastText(options.entityLabel);
  const rootKey = options.keys ? options.keys.all : options.queryKey;
  const detailKeyOf = (item: TItem): readonly unknown[] | undefined =>
    options.keys ? options.keys.detail(item.id) : options.detailKey?.(item);

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Nullable<TItem>>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Nullable<TItem>>(null);

  type ListResult = { data: TItem[]; meta?: PaginatedData<TItem>['meta'] };

  // A paginated list always has a `pageKey` (the type requires it). A
  // non-paginated list keys on the root.
  const listKey = fetchPage && pageKey ? pageKey(page) : [...rootKey];

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

  type SaveInput = { values: TSaveInput; target: Nullable<TItem> };

  const saveMutation = useServerMutation<SaveInput, unknown>({
    mutationFn: ({ values, target }) =>
      target ? update(target.id, values) : create(values),
    errorMessage: text.saveError,
    invalidate: [rootKey],
    onSuccess: (_data, { target }) => {
      toast.success(target ? text.updated : text.created);
      closeDialog();
      // Remove, don't invalidate, and only after closeDialog: an invalidated entry
      // would show the pre-save record for one render on the next open.
      const detail = target ? detailKeyOf(target) : undefined;
      if (detail) queryClient.removeQueries({ queryKey: detail });
    },
  });

  const deleteMutation = useServerMutation<TItem, unknown>({
    mutationFn: (item) => remove(item.id),
    errorMessage: text.deleteError,
    invalidate: [rootKey],
    onSuccess: (_data, item) => {
      toast.success(text.deleted);
      // The same per-item cache as a save: the id cannot be reopened, but its
      // document would otherwise sit in memory until garbage collection.
      const detail = detailKeyOf(item);
      if (detail) queryClient.removeQueries({ queryKey: detail });
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
