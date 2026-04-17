'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminTechStack } from '@/entities/tech-stack';
import { addTechStack } from '@/entities/tech-stack/api/create-tech-stack';
import { deleteTechStack } from '@/entities/tech-stack/api/delete-tech-stack';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { updateTechStack } from '@/entities/tech-stack/api/update-tech-stack';
import type { TechStackFormValues } from '@/entities/tech-stack/model/tech-stack-schema';
import { useToast } from '@/shared/hooks/use-toast';
import { CACHE_TAGS } from '@/shared/lib/constants';





export function useTechStackManagement(initialData: AdminTechStack[]) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingTech, setEditingTech] = useState<AdminTechStack | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [techToDelete, setTechToDelete] = useState<AdminTechStack | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: [CACHE_TAGS.TECH],
    queryFn: getAllAdminTechStack,
    initialData: { success: true, data: initialData },
  });

  const techStacks = response?.success ? response.data : [];

  const saveMutation = useMutation({
    mutationFn: (values: TechStackFormValues) =>
      editingTech
        ? updateTechStack(editingTech.id, values)
        : addTechStack(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_TAGS.TECH] });
      toast({ title: editingTech ? 'Tech stack updated' : 'Tech stack added' });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTechStack(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_TAGS.TECH] });
      toast({ title: 'Tech stack removed' });
      setTechToDelete(null);
    },
  });

  const openEditDialog = (tech: AdminTechStack) => {
    setEditingTech(tech);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingTech(null);
    setIsDialogOpen(false);
  };

  return {
    techStacks,
    isLoading,
    editingTech,
    isDialogOpen,
    setIsDialogOpen,
    techToDelete,
    setTechToDelete,
    actions: {
      openEditDialog,
      closeDialog,
      handleSave: (values: TechStackFormValues) => saveMutation.mutate(values),
      handleDelete: () =>
        techToDelete && deleteMutation.mutate(techToDelete.id),
      isSaving: saveMutation.isPending,
      isDeleting: deleteMutation.isPending,
    },
  };
}
