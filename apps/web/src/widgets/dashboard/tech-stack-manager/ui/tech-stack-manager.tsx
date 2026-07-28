'use client';

import { useMemo } from 'react';
import { Button, ConfirmDeleteDialog } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';

import { TechStackDialog } from './tech-stack-dialog';

import type { AdminTechStack } from '@/entities/tech-stack';
import { addTechStack } from '@/entities/tech-stack/api/create-tech-stack';
import { deleteTechStack } from '@/entities/tech-stack/api/delete-tech-stack';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { updateTechStack } from '@/entities/tech-stack/api/update-tech-stack';
import { techStackKeys } from '@/entities/tech-stack/model/query-keys';
import type { TechStackFormValues } from '@/entities/tech-stack/model/tech-stack-schema';
import { TechStackCard } from '@/features/dashboard';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function TechStackManager({
  initialTechStacks,
}: {
  initialTechStacks: AdminTechStack[];
}) {
  const {
    items: techStacks,
    isLoading,
    isError,
    refetch,
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
    fetchAll: getAllAdminTechStack,
    initialItems: initialTechStacks,
    create: addTechStack,
    update: updateTechStack,
    remove: deleteTechStack,
  });

  const grouped = useMemo(() => {
    return techStacks.reduce<Record<string, AdminTechStack[]>>((acc, item) => {
      const groupName = item.group || 'Other';
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(item);
      return acc;
    }, {});
  }, [techStacks]);

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title="Tech Stack"
        description="Maintain the list of technologies, frameworks, and tools you use."
        action={
          <Button onClick={openCreateDialog} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add TechStack
          </Button>
        }
      />

      <ManagerListState
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        isEmpty={techStacks.length === 0}
        emptyTitle="No tech stacks found"
        emptyAction={
          <Button variant="outline" size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" /> Add TechStack
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
        title="Remove Tech stack"
        description={
          <p>
            Are you sure you want to remove{' '}
            <span className="font-bold text-foreground">
              {techToDelete?.name}
            </span>
            ? This will hide it from your tech stack showcase.
          </p>
        }
      />
    </div>
  );
}
