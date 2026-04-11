'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AdminEducation } from '@/entities/education';
import { createEducation } from '@/entities/education/api/create-education';
import { deleteEducation } from '@/entities/education/api/delete-education';
import { getAllAdminEducations } from '@/entities/education/api/get-all-admin-educations';
import { updateEducation } from '@/entities/education/api/update-education';
import type { EducationFormValues } from '@/entities/education/schemas/education';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/ui/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import { EducationDialog } from './education-dialog';

export function EducationManager({
  initialData,
}: {
  initialData: AdminEducation[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminEducation | null>(null);
  const [open, setOpen] = useState(false);

  // Fetch
  const { data: response } = useQuery({
    queryKey: ['educations'],
    queryFn: getAllAdminEducations,
    initialData: { success: true, data: initialData },
  });

  const educations = response?.success ? response.data : [];

  // Save
  const saveMutation = useMutation({
    mutationFn: (values: EducationFormValues) =>
      editing ? updateEducation(editing.id, values) : createEducation(values),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educations'] });
      toast({
        title: editing ? 'PublicEducation updated' : 'PublicEducation created',
      });
      setOpen(false);
    },

    onError: () =>
      toast({ title: 'Error saving education', variant: 'destructive' }),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: deleteEducation,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educations'] });
      toast({ title: 'PublicEducation removed' });
    },

    onError: () =>
      toast({ title: 'Error deleting education', variant: 'destructive' }),
  });

  // Handlers
  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (edu: AdminEducation) => {
    setEditing(edu);
    setOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-end">
        <Button onClick={handleCreate} size="sm" className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" />
          Add Education
        </Button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {educations.map((edu) => {
          const title = edu.translations?.[0]?.title || 'Untitled education';

          const dateRange = `${formatDate(edu.startDate)} - ${
            edu.endDate ? formatDate(edu.endDate) : 'Present'
          }`;

          return (
            <div
              key={edu.id}
              className="group flex items-center justify-between bg-card border rounded-xl p-4 hover:border-primary/50 transition-all hover:shadow-sm"
            >
              {/* Left */}
              <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="h-12 w-12 flex items-center justify-center bg-muted rounded-lg overflow-hidden p-2">
                  {edu.logo?.url ? (
                    <Image
                      src={edu.logo.url}
                      alt={title}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground font-bold">
                      {title.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{dateRange}</p>

                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">
                      {edu.achievements.length} achievements
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleEdit(edu)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete "${title}"?`)) {
                      deleteMutation.mutate(edu.id);
                    }
                  }}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}

        {!educations.length && (
          <div className="text-center text-sm text-muted-foreground py-12">
            No education entries yet.
          </div>
        )}
      </div>

      {/* Dialog */}
      <EducationDialog
        open={open}
        onOpenChange={setOpen}
        initialData={editing}
        onSubmit={(values) => saveMutation.mutate(values)}
        loading={saveMutation.isPending}
      />
    </div>
  );
}


function formatDate(date: Date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}
