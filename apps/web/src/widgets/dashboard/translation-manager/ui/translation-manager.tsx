'use client';

import {
  Badge,
  Button,
  ConfirmDeleteDialog,
  DeleteButton,
  EditButton,
  Loading,
  Pagination,
} from '@byte-of-me/ui';
import { Plus } from 'lucide-react';

import { TranslationDialog } from './translation-dialog';

import {
  type AdminTranslation,
  createTranslation,
  deleteTranslation,
  getPaginatedAdminTranslations,
  type TranslationFormValues,
  updateTranslation,
} from '@/entities/translation';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function TranslationManager() {
  const {
    items: translations,
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
    itemToDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    isDeletingItem,
  } = useCrudManager<AdminTranslation, TranslationFormValues>({
    queryKey: 'translations',
    entityLabel: 'Translation',
    pageSize: 12,
    fetchPage: (page, limit) => getPaginatedAdminTranslations(page, limit),
    create: createTranslation,
    update: updateTranslation,
    remove: deleteTranslation,
  });

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title="Translations"
        description="Override UI text per language without redeploying."
        action={
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create New Translation
          </Button>
        }
      />

      <div className="relative min-h-[300px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isEmpty={translations.length === 0}
          emptyTitle="No translations found"
          emptyDescription="Add overrides to change UI text without a redeploy."
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={openCreateDialog}
            >
              Create First Translation
            </Button>
          }
          skeleton={
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loading />

              <p className="animate-pulse text-xs text-muted-foreground">
                Fetching translations...
              </p>
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            {translations.map((translation) => (
              <div
                key={translation.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="truncate font-mono text-sm font-medium">
                      {translation.sourceText}
                    </code>
                    <Badge variant="secondary" className="shrink-0 uppercase">
                      {translation.language}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {translation.translated}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <EditButton onClick={() => openEditDialog(translation)} />
                  <DeleteButton
                    onClick={() => requestDelete(translation)}
                    isSubmitting={isDeletingItem(translation)}
                  />
                </div>
              </div>
            ))}
          </div>
        </ManagerListState>

        {!isLoading && isFetching && (
          <div className="absolute -top-12 right-0">
            <Loading />
          </div>
        )}
      </div>

      {pagination && translations.length > 0 && (
        <div className="pt-4">
          <Pagination
            pagination={pagination}
            setPage={setPage}
            isPlaceholderData={isPlaceholderData}
          />
        </div>
      )}

      <TranslationDialog
        key={editing?.id || 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={editing}
        onSubmit={(data) => save(data)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!itemToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Translation"
        description={
          <>
            This will permanently delete the override for{' '}
            <span className="font-mono font-semibold text-foreground">
              "{itemToDelete?.sourceText}"
            </span>{' '}
            ({itemToDelete?.language}). The static message will be used again.
          </>
        }
      />
    </div>
  );
}
