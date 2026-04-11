'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { AdminTechStack } from '@/entities/tech-stack';
import { addTechStack } from '@/entities/tech-stack/api/create-tech-stack';
import { deleteTechStack } from '@/entities/tech-stack/api/delete-tech-stack';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { updateTechStack } from '@/entities/tech-stack/api/update-tech-stack';
import { TechStackFormValues } from '@/entities/tech-stack/schemas/tech-stack';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/ui/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import { TechStackDialog } from './tech-stack-dialog';

export function TechStackManager({
  initialTechStacks,
}: {
  initialTechStacks: AdminTechStack[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminTechStack | null>(null);
  const [open, setOpen] = useState(false);

  const { data: response } = useQuery({
    queryKey: ['techStacks'],
    queryFn: getAllAdminTechStack,
    initialData: { success: true, data: initialTechStacks },
  });

  const techStacks = response?.success ? response.data : [];

  const saveMutation = useMutation({
    mutationFn: (values: TechStackFormValues) =>
      editing ? updateTechStack(editing.id, values) : addTechStack(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techStacks'] });
      toast({ title: editing ? 'Tech updated' : 'Tech added' });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTechStack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techStacks'] });
      toast({ title: 'Tech removed' });
    },
  });

  const grouped = useMemo(() => {
    return techStacks.reduce<Record<string, AdminTechStack[]>>((acc, item) => {
      const groupName = item.group || 'Other';
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(item);
      return acc;
    }, {});
  }, [techStacks]);

  const handleOpenEdit = (tech: AdminTechStack) => {
    setEditing(tech);
    setOpen(true);
  };

  const handleOpenCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleSubmit = async (values: TechStackFormValues) => {
    await saveMutation.mutateAsync(values);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add TechStack
        </Button>
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {Object.entries(grouped).map(([group, items]) => (
          <div
            key={group}
            className="space-y-3 break-inside-avoid border-2 border-dashed rounded-md p-4"
          >
            <h3 className="text-base font-semibold">{group}</h3>

            {items.map((tech) => (
              <div
                key={tech.id}
                className="flex p-2 gap-2 justify-between border-dashed border rounded-md items-center"
              >
                <div className="flex gap-2 items-center">
                  {tech.logo?.url && (
                    <Image
                      src={tech.logo.url}
                      alt={tech.name}
                      width={32}
                      height={32}
                    />
                  )}
                  <div className={'flex flex-col gap-2'}>
                    <p className={'text-sm'}>{tech.name}</p>
                    <p className={'text-sm text-muted-foreground'}>
                      {tech.slug}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant={'ghost'}
                    size="icon"
                    onClick={() => handleOpenEdit(tech)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={'ghost'}
                    size="icon"
                    onClick={() => deleteMutation.mutate(tech.id)}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <TechStackDialog
        open={open}
        onOpenChange={setOpen}
        initialData={editing}
        onSubmit={handleSubmit}
        loading={saveMutation.isPending}
      />
    </div>
  );
}
