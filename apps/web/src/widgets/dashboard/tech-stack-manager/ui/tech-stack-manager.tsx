'use client';

import { useMemo } from 'react';
import { Plus } from 'lucide-react';

import { TechStackDialog } from './tech-stack-dialog';

import type { AdminTechStack } from '@/entities/tech-stack';
import { TechStackCard, useTechStackManagement } from '@/features/dashboard';
import { Button , ConfirmDeleteDialog } from '@/shared/ui';

export function TechStackManager({
  initialTechStacks,
}: {
  initialTechStacks: AdminTechStack[];
}) {
  const {
    techStacks,
    editingTech,
    isDialogOpen,
    setIsDialogOpen,
    techToDelete,
    setTechToDelete,
    actions,
  } = useTechStackManagement(initialTechStacks);

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
      <div className="flex justify-end">
        <Button
          onClick={() => setIsDialogOpen(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Add TechStack
        </Button>
      </div>

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
                  techStack={tech}
                  onEdit={() => actions.openEditDialog(tech)}
                  onDelete={() => setTechToDelete(tech)}
                  isDeleting={actions.isDeleting}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <TechStackDialog
        key={editingTech?.id || 'new'}
        open={isDialogOpen}
        onOpenChange={(val) => !val && actions.closeDialog()}
        initialData={editingTech}
        onSubmit={(values) => actions.handleSave(values)}
        loading={actions.isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!techToDelete}
        isLoading={actions.isDeleting}
        onClose={() => setTechToDelete(null)}
        onConfirm={actions.handleDelete}
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
