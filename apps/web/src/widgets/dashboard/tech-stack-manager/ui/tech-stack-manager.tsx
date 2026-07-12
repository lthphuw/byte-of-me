'use client';

import { useMemo, useState } from 'react';
import { Button, ConfirmDeleteDialog } from '@byte-of-me/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { TechStackDialog } from './tech-stack-dialog';

import type { AdminTechStack } from '@/entities/tech-stack';
import { addTechStack } from '@/entities/tech-stack/api/create-tech-stack';
import { deleteTechStack } from '@/entities/tech-stack/api/delete-tech-stack';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { updateTechStack } from '@/entities/tech-stack/api/update-tech-stack';
import type { TechStackFormValues } from '@/entities/tech-stack/model/tech-stack-schema';
import { TechStackCard } from '@/features/dashboard';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function TechStackManager({
  initialTechStacks,
}: {
  initialTechStacks: AdminTechStack[];
}) {
  const queryClient = useQueryClient();

  const [editingTech, setEditingTech] = useState<Nullable<AdminTechStack>>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [techToDelete, setTechToDelete] = useState<Nullable<AdminTechStack>>(null);

  // Non-paginated list, so this stays a local query instead of
  // useCrudManager's fetchPage.
  const {
    data: techStacks = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [CACHE_TAGS.TECH],
    queryFn: async () => {
      const res = await getAllAdminTechStack();
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    initialData: initialTechStacks,
    placeholderData: (prev) => prev,
  });

  const closeDialog = () => {
    setEditingTech(null);
    setIsDialogOpen(false);
  };

  const saveMutation = useMutation({
    mutationFn: (values: TechStackFormValues) =>
      editingTech
        ? updateTechStack(editingTech.id, values)
        : addTechStack(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_TAGS.TECH] });
      toast(editingTech ? 'Tech stack updated' : 'Tech stack added');
      closeDialog();
    },
    onError: () => toast.error('Failed to save tech stack'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTechStack(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_TAGS.TECH] });
      toast('Tech stack removed');
      setTechToDelete(null);
    },
    onError: () => toast.error('Could not delete tech stack'),
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
          <Button
            onClick={() => setIsDialogOpen(true)}
            size="sm"
            className="gap-2"
          >
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
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
                    onEdit={() => {
                      setEditingTech(tech);
                      setIsDialogOpen(true);
                    }}
                    onDelete={() => setTechToDelete(tech)}
                    isDeleting={deleteMutation.isPending}
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
        onOpenChange={(val) => !val && closeDialog()}
        initialData={editingTech}
        onSubmit={(values) => saveMutation.mutate(values)}
        loading={saveMutation.isPending}
      />

      <ConfirmDeleteDialog
        isOpen={!!techToDelete}
        isLoading={deleteMutation.isPending}
        onClose={() => setTechToDelete(null)}
        onConfirm={() => techToDelete && deleteMutation.mutate(techToDelete.id)}
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
