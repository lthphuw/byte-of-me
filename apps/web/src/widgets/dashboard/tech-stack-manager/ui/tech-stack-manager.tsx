'use client';

import { Fragment, useMemo } from 'react';
import {
  type TechStackFormValues,
  techStackKeys,
} from '@byte-of-me/contracts/tech-stack';
import { useTranslations } from 'next-intl';

import { TechStackDialog } from './tech-stack-dialog';

import { addTechStack } from '@/entities/tech-stack/api/create-tech-stack';
import { deleteTechStack } from '@/entities/tech-stack/api/delete-tech-stack';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { updateTechStack } from '@/entities/tech-stack/api/update-tech-stack';
import type { AdminTechStack } from '@/entities/tech-stack/model';
import { useAdminTechStackById } from '@/entities/tech-stack/query';
import { TechStackCard } from '@/features/dashboard/tech-stack-management';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import {
  AddButton,
  ConfirmDeleteDialog,
  ManagerListState,
  ManagerPageHeader,
  RecordListSkeleton,
} from '@/shared/ui';

/**
 * `initialTechStacks` is the server's seed of the list. Absent when that read
 * failed, and the client then loads the list itself and shows its error state.
 */
export function TechStackManager({
  initialTechStacks,
}: {
  initialTechStacks?: AdminTechStack[];
}) {
  const t = useTranslations('dashboard.techStack');
  const tCrud = useTranslations('dashboard.shared.crud');
  const {
    items: techStacks,
    isLoading,
    isError,
    refetch,
    isFetching,
    editing: editingTech,
    isDialogOpen,
    onDialogOpenChange,
    openCreateDialog,
    openEditDialog,
    save,
    isSaving,
    itemToDelete: techToDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    isDeletingItem,
  } = useCrudManager<AdminTechStack, TechStackFormValues>({
    entity: t('entity'),
    keys: { all: techStackKeys.all, detail: techStackKeys.detail },
    fetchAll: getAllAdminTechStack,
    initialItems: initialTechStacks,
    create: addTechStack,
    update: updateTechStack,
    remove: deleteTechStack,
  });

  // The list row is not the editor's source: the dialog loads the full record
  // by id. "New" (`editingTech` is null) fetches nothing.
  const fullTech = useAdminTechStackById(editingTech?.id ?? null);

  const grouped = useMemo(() => {
    return techStacks.reduce<Record<string, AdminTechStack[]>>((acc, item) => {
      const groupName = item.group || t('otherGroup');
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(item);
      return acc;
    }, {});
  }, [techStacks, t]);

  const newLabel = tCrud('newTitle', { entity: t('entity') });

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <AddButton label={newLabel} onClick={openCreateDialog} />
        }
      />

      {/* `relative` so ManagerListState's background-refetch spinner has
          something to anchor to. */}
      <div className="relative min-h-[200px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={techStacks.length === 0}
          skeleton={<RecordListSkeleton variant="grid" />}
          emptyTitle={t('emptyTitle')}
          emptyAction={
            <AddButton
              label={newLabel}
              onClick={openCreateDialog}
              variant="outline"
            />
          }
        >
          {/* One grid for the whole list. A group heading spans every column,
              so the groups stay visible without a masonry layout. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(grouped).map(([group, items]) => (
              <Fragment key={group}>
                <h3 className="col-span-full text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {group}
                </h3>
                {items.map((tech) => (
                  <TechStackCard
                    key={tech.id}
                    techStack={tech}
                    onEdit={() => openEditDialog(tech)}
                    onDelete={() => requestDelete(tech)}
                    isDeleting={isDeletingItem(tech)}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </ManagerListState>
      </div>

      <TechStackDialog
        key={editingTech?.id || 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        isEditing={Boolean(editingTech)}
        initialData={fullTech.record}
        isLoadingInitialData={fullTech.isNotReady}
        hasLoadError={fullTech.hasError}
        onRetryLoad={fullTech.retry}
        onSubmit={(values) => save(values)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        open={!!techToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={tCrud('deleteTitle', { entity: t('entity') })}
        description={tCrud('deleteDescription', {
          name: techToDelete?.name ?? '',
        })}
      />
    </div>
  );
}
