'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@byte-of-me/ui';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { FeaturedWorkDialog } from './featured-work-dialog';

import { createFeaturedWork } from '@/entities/featured-work/api/create-featured-work';
import { deleteFeaturedWork } from '@/entities/featured-work/api/delete-featured-work';
import { getPaginatedAdminFeaturedWorks } from '@/entities/featured-work/api/get-paginated-admin-featured-works';
import { updateFeaturedWork } from '@/entities/featured-work/api/update-featured-work';
import {
  type AdminFeaturedWork,
  type FeaturedWorkFormValues,
  featuredWorkKeys,
} from '@/entities/featured-work/model';
import {
  featuredWorkQueries,
  useAdminFeaturedWorkById,
} from '@/entities/featured-work/query';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';
import {
  ConfirmDeleteDialog,
  ManagerListState,
  ManagerPageHeader,
  ManagerPagination,
  RecordListItem,
  RecordRowActions,
} from '@/shared/ui';
import { useReorderFeaturedWork } from '@/widgets/dashboard/featured-work-manager/lib/use-reorder-featured-work';

export function FeaturedWorkManager() {
  const t = useTranslations('dashboard.featuredWorks');
  const crud = useTranslations('dashboard.shared.crud');
  const locale = useLocale();
  const entity = t('entity');
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
  } = useCrudManager<AdminFeaturedWork, FeaturedWorkFormValues>({
    entity,
    keys: featuredWorkKeys,
    pageSize: ADMIN_PAGE_SIZE,
    pageKey: (page) => featuredWorkQueries.adminPage(page).queryKey,
    fetchPage: getPaginatedAdminFeaturedWorks,
    create: createFeaturedWork,
    update: updateFeaturedWork,
    remove: deleteFeaturedWork,
  });
  // The list row carries no bodies, so the dialog loads the full row by id.
  // "New" (`editing` is null) fetches nothing and opens an empty form.
  const fullWork = useAdminFeaturedWorkById(editing?.id);
  const { move, isMoving } = useReorderFeaturedWork({
    updated: crud('updated', { entity }),
    saveError: crud('saveError', { entity }),
  });

  // Arrows use `aria-disabled` so they stay focusable. A reorder moves DOM
  // nodes and drops focus; it is restored once the refetch lands, unless the
  // user has moved on.
  const moveButtons = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<string | null>(null);
  useEffect(() => {
    if (isMoving || refocus.current === null) return;
    const target = moveButtons.current.get(refocus.current);
    refocus.current = null;
    // Moving a node leaves focus on <body>; anywhere else means the user
    // went on (Edit, Delete, a dialog) during the round trip, so leave it.
    const active = document.activeElement;
    if (active === null || active === document.body || active === target) {
      target?.focus();
    }
  }, [isMoving, works]);

  const requestMove = (
    id: string,
    direction: 'up' | 'down',
    blocked: boolean
  ) => {
    if (blocked || isMoving) return;
    refocus.current = `${id}:${direction}`;
    move(id, direction);
  };
  const moveButtonRef = (key: string) => (node: HTMLButtonElement | null) => {
    if (node) moveButtons.current.set(key, node);
    else moveButtons.current.delete(key);
  };
  // Position in the whole list, not on this page: the first row of page 2 can
  // still move up, and only the very first and very last entries cannot move.
  const firstPosition = ((pagination?.currentPage ?? 1) - 1) * ADMIN_PAGE_SIZE;
  const totalCount = pagination?.totalCount ?? works.length;

  const titleOf = (work: AdminFeaturedWork) =>
    getTranslatedContent(work.translations, locale)?.title || t('untitled');

  const newWorkButton = (
    <Button
      onClick={openCreateDialog}
      size="sm"
      className="min-h-11 gap-2 can-hover:min-h-9"
    >
      <Plus className="h-4 w-4" />
      {t('createButton')}
    </Button>
  );

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={newWorkButton}
      />

      <div className="relative min-h-[200px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={works.length === 0}
          pagination={
            <ManagerPagination
              pagination={pagination}
              setPage={setPage}
              isPlaceholderData={isPlaceholderData}
              className="mt-6"
            />
          }
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 can-hover:min-h-9"
              onClick={openCreateDialog}
            >
              {t('emptyAction')}
            </Button>
          }
        >
          <ol role="list" className="grid gap-4">
            {works.map((work, index) => {
              const title = titleOf(work);
              const position = firstPosition + index;

              return (
                <li key={work.id}>
                  <RecordListItem
                    leading={
                      <span
                        aria-hidden
                        className="hidden w-6 text-center text-sm font-medium tabular-nums text-muted-foreground sm:block"
                      >
                        {position + 1}
                      </span>
                    }
                    actions={
                      <>
                        {/* Never hover-gated: a touch screen has no hover to reveal them. */}
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                          <Button
                            ref={moveButtonRef(`${work.id}:up`)}
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={t('moveUpLabel', { name: title })}
                            aria-disabled={isMoving || position === 0}
                            onClick={() =>
                              requestMove(work.id, 'up', position === 0)
                            }
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            ref={moveButtonRef(`${work.id}:down`)}
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={t('moveDownLabel', { name: title })}
                            aria-disabled={
                              isMoving || position === totalCount - 1
                            }
                            onClick={() =>
                              requestMove(
                                work.id,
                                'down',
                                position === totalCount - 1
                              )
                            }
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <RecordRowActions
                          name={title}
                          onEdit={() => openEditDialog(work)}
                          onDelete={() => requestDelete(work)}
                        />
                      </>
                    }
                  >
                    <h4 className="truncate font-semibold leading-none">
                      {title}
                    </h4>
                    <p className="truncate pt-1 text-xs text-muted-foreground">
                      {t('linkCount', { count: work._count.links })}
                    </p>
                  </RecordListItem>
                </li>
              );
            })}
          </ol>
        </ManagerListState>
      </div>

      <FeaturedWorkDialog
        key={editing?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        isEditing={Boolean(editing)}
        initialData={fullWork.record}
        isLoadingInitialData={fullWork.isNotReady}
        hasLoadError={fullWork.hasError}
        onRetryLoad={fullWork.retry}
        onSubmit={save}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        open={!!workToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={crud('deleteTitle', { entity })}
        description={crud('deleteDescription', {
          name: workToDelete ? titleOf(workToDelete) : '',
        })}
      />
    </div>
  );
}
