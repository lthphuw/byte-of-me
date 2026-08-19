'use client';

import { useMemo } from 'react';
import { Button, ConfirmDeleteDialog } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TechStackDialog } from './tech-stack-dialog';

import type { AdminTechStack } from '@/entities/tech-stack';
import { addTechStack } from '@/entities/tech-stack/api/create-tech-stack';
import { deleteTechStack } from '@/entities/tech-stack/api/delete-tech-stack';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { updateTechStack } from '@/entities/tech-stack/api/update-tech-stack';
import { techStackKeys } from '@/entities/tech-stack/model/query-keys';
import type { TechStackFormValues } from '@/entities/tech-stack/model/tech-stack-schema';
import { TechStackCard } from '@/features/dashboard/tech-stack-management';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function TechStackManager({
  initialTechStacks,
}: {
  initialTechStacks: AdminTechStack[];
}) {
  const t = useTranslations('dashboard.techStack');
  const tShared = useTranslations('dashboard.shared');
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
    queryKey: techStackKeys.list(),
    entityLabel: 'Tech stack',
    messages: {
      created: t('toast.created'),
      updated: t('toast.updated'),
      deleted: t('toast.deleted'),
      saveError: t('toast.saveError'),
      deleteError: t('toast.deleteError'),
    },
    fetchAll: getAllAdminTechStack,
    initialItems: initialTechStacks,
    create: addTechStack,
    update: updateTechStack,
    remove: deleteTechStack,
  });

  const grouped = useMemo(() => {
    return techStacks.reduce<Record<string, AdminTechStack[]>>((acc, item) => {
      const groupName = item.group || t('otherGroup');
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(item);
      return acc;
    }, {});
  }, [techStacks, t]);

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Button onClick={openCreateDialog} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> {t('createButton')}
          </Button>
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
          emptyTitle={t('emptyTitle')}
          emptyAction={
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" /> {t('createButton')}
            </Button>
          }
        >
          <div className="columns-1 gap-6 space-y-6 md:columns-2 lg:columns-3">
            {Object.entries(grouped).map(([group, items]) => (
              <section
                key={group}
                className="break-inside-avoid space-y-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {group}
                </h3>

                <div className="space-y-2">
                  {items.map((tech) => (
                    <TechStackCard
                      key={tech.id}
                      techStack={tech}
                      onEdit={() => openEditDialog(tech)}
                      onDelete={() => requestDelete(tech)}
                      isDeleting={isDeletingItem(tech)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ManagerListState>
      </div>

      <TechStackDialog
        key={editingTech?.id || 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={editingTech}
        onSubmit={(values) => save(values)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!techToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        description={
          <p>
            {t.rich('deleteDescription', {
              name: () => (
                <span className="font-bold text-foreground">
                  {techToDelete?.name}
                </span>
              ),
            })}
          </p>
        }
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
