'use client';

import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import Image from 'next/image';

import { TechStackDialog } from './tech-stack-dialog';

import type { AdminTechStack } from '@/entities/tech-stack';
import { useTechStackManagement } from '@/features/dashboard';
import { Button } from '@/shared/ui/button';
import { ConfirmDeleteDialog } from '@/shared/ui/confirm-delete-dialog';
import { DeleteButton } from '@/shared/ui/delete-button';
import { EditButton } from '@/shared/ui/edit-button';

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
                <div
                  key={tech.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {tech.logo?.url && (
                      <div className="relative h-8 w-8 overflow-hidden rounded-md border bg-white p-1">
                        <Image
                          src={tech.logo.url}
                          alt={tech.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {tech.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tech.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <EditButton onClick={() => actions.openEditDialog(tech)} />
                    <DeleteButton
                      isSubmitting={actions.isDeleting}
                      onClick={() => setTechToDelete(tech)}
                    />
                  </div>
                </div>
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
