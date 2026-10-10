'use client';

import { useEffect, useRef } from 'react';
import {
  Badge,
  Button,
  ConfirmDeleteDialog,
  DeleteButton,
  EditButton,
  Pagination,
} from '@byte-of-me/ui';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { FeaturedWorkDialog } from './featured-work-dialog';

import type { AdminFeaturedWork } from '@/entities/featured-work';
import { createFeaturedWork } from '@/entities/featured-work/api/create-featured-work';
import { deleteFeaturedWork } from '@/entities/featured-work/api/delete-featured-work';
import { getPaginatedAdminFeaturedWorks } from '@/entities/featured-work/api/get-paginated-admin-featured-works';
import { updateFeaturedWork } from '@/entities/featured-work/api/update-featured-work';
import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';
import { featuredWorkKeys } from '@/entities/featured-work/model/query-keys';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';
import { linkHost } from '@/widgets/dashboard/featured-work-manager/lib/link-host';
import { useReorderFeaturedWork } from '@/widgets/dashboard/featured-work-manager/lib/use-reorder-featured-work';

export function FeaturedWorkManager() {
  const t = useTranslations('dashboard.featuredWorks');
  const tShared = useTranslations('dashboard.shared');
  const locale = useLocale();
  const {
    items: works,
    pagination,
    isLoading,
    isError,
    refetch,
    isFetching,
    isPlaceholderData,
    setPage,
    editing,
    isDialogOpen,
    onDialogOpenChange,
    openCreateDialog,
    openEditDialog,
    save,
    isSaving,
    itemToDelete: workToDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    isDeletingItem,
  } = useCrudManager<AdminFeaturedWork, FeaturedWorkFormValues>({
    queryKey: featuredWorkKeys.adminList(),
    entityLabel: 'Featured work',
    messages: {
      created: t('toast.created'),
      updated: t('toast.updated'),
      deleted: t('toast.deleted'),
      saveError: t('toast.saveError'),
      deleteError: t('toast.deleteError'),
    },
    pageSize: ADMIN_PAGE_SIZE,
    pageKey: featuredWorkKeys.adminPage,
    fetchPage: (page, limit) => getPaginatedAdminFeaturedWorks(page, limit),
    create: createFeaturedWork,
    update: updateFeaturedWork,
    remove: deleteFeaturedWork,
  });
  const { move, isMoving } = useReorderFeaturedWork(t('toast.reorderError'));

  // The arrows stay focusable (`aria-disabled`, not `disabled`) so a keyboard
  // user can press one repeatedly. Reordering the list moves DOM nodes, which
  // drops focus, so it is put back on the arrow that was used once the
  // refetch has landed (`isMoving` stays true until then).
  const moveButtons = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<string | null>(null);
  useEffect(() => {
    if (isMoving || refocus.current === null) return;
    moveButtons.current.get(refocus.current)?.focus();
    refocus.current = null;
  }, [isMoving, works]);

  const requestMove = (id: string, direction: 'up' | 'down', blocked: boolean) => {
    if (blocked || isMoving) return;
    refocus.current = `${id}:${direction}`;
    move(id, direction);
  };
  const moveButtonRef =
    (key: string) => (node: HTMLButtonElement | null) => {
      if (node) moveButtons.current.set(key, node);
      else moveButtons.current.delete(key);
    };
  const moveButtonClass =
    'h-8 w-8 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

  // Position in the whole list, not on this page: the first row of page 2 can
  // still move up, and only the very first and very last entries cannot move.
  const firstPosition = ((pagination?.currentPage ?? 1) - 1) * ADMIN_PAGE_SIZE;
  const totalCount = pagination?.totalCount ?? works.length;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Button onClick={openCreateDialog} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t('createButton')}
          </Button>
        }
      />

      <div className="relative min-h-[200px] space-y-4">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={works.length === 0}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          emptyAction={
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              {t('emptyAction')}
            </Button>
          }
        >
          <ol role="list" className="grid gap-4">
            {works.map((work, index) => {
              // Admin reads keep every locale ordered `language: 'asc'`, so
              // the first row is always English — resolve against the
              // dashboard's own locale instead.
              const title =
                getTranslatedContent(work.translations, locale)?.title ||
                t('untitled');
              const host = linkHost(work.url);
              const position = firstPosition + index;

              return (
                <li
                  key={work.id}
                  className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      aria-hidden
                      className="w-6 shrink-0 text-center text-sm font-medium tabular-nums text-muted-foreground"
                    >
                      {position + 1}
                    </span>

                    <div className="min-w-0 space-y-1">
                      <h4 className="truncate font-semibold leading-none">
                        {title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge
                          variant={work.isPublished ? 'secondary' : 'outline'}
                          className="px-2 py-0 text-[10px]"
                        >
                          {work.isPublished ? t('published') : t('draft')}
                        </Badge>
                        {host && (
                          <span className="truncate text-xs text-muted-foreground">
                            {host}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {/* Never hover-gated: a touch screen has no hover to reveal them. */}
                    <Button
                      ref={moveButtonRef(`${work.id}:up`)}
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={moveButtonClass}
                      aria-label={t('moveUpLabel', { name: title })}
                      aria-disabled={isMoving || position === 0}
                      onClick={() => requestMove(work.id, 'up', position === 0)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      ref={moveButtonRef(`${work.id}:down`)}
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={moveButtonClass}
                      aria-label={t('moveDownLabel', { name: title })}
                      aria-disabled={isMoving || position === totalCount - 1}
                      onClick={() =>
                        requestMove(work.id, 'down', position === totalCount - 1)
                      }
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                      <EditButton
                        label={t('editLabel', { name: title })}
                        onClick={() => openEditDialog(work)}
                      />
                      <DeleteButton
                        label={t('deleteLabel', { name: title })}
                        isSubmitting={isDeletingItem(work)}
                        onClick={() => requestDelete(work)}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </ManagerListState>
      </div>

      {works.length > 0 && (
        <Pagination
          pagination={pagination}
          setPage={setPage}
          isPlaceholderData={isPlaceholderData}
          pageLabel={tShared('pagination.pageLabel', {
            page: pagination?.currentPage ?? 1,
            totalPages: pagination?.totalPages ?? 1,
          })}
          previousLabel={tShared('pagination.previous')}
          nextLabel={tShared('pagination.next')}
        />
      )}

      <FeaturedWorkDialog
        key={editing?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={editing}
        onSubmit={(values) => save(values)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!workToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        description={t.rich('deleteDescription', {
          name: () => (
            <span className="font-medium text-foreground">
              {(workToDelete &&
                getTranslatedContent(workToDelete.translations, locale)
                  ?.title) ||
                t('untitled')}
            </span>
          ),
        })}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
