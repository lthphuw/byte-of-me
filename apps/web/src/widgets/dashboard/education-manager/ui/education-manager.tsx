'use client';

import { useState } from 'react';
import type { AdminEducation } from '@/entities/education';
import { createEducation } from '@/entities/education/api/create-education';
import { deleteEducation } from '@/entities/education/api/delete-education';
import { getAllAdminEducations } from '@/entities/education/api/get-all-admin-educations';
import { updateEducation } from '@/entities/education/api/update-education';
import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { useToast } from '@/shared/hooks/use-toast';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';

import { EducationDialog } from './education-dialog';

export function EducationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminEducation | null>(null);
  const [open, setOpen] = useState(false);

  // Fetch
  const { data: response } = useQuery({
    queryKey: ['educations'],
    queryFn: getAllAdminEducations,
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
      toast({ title: 'Error saving educationSchema', variant: 'destructive' }),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: deleteEducation,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educations'] });
      toast({ title: 'PublicEducation removed' });
    },

    onError: () =>
      toast({
        title: 'Error deleting educationSchema',
        variant: 'destructive',
      }),
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
          const title =
            edu.translations?.[0]?.title || 'Untitled educationSchema';

          const dateRange = `${formatDate(edu.startDate)} - ${
            edu.endDate ? formatDate(edu.endDate) : 'Present'
          }`;

          return (
            <div
              key={edu.id}
              className="bg-card hover:border-primary/50 group flex items-center justify-between rounded-xl border p-4 transition-all hover:shadow-sm"
            >
              {/* Left */}
              <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="bg-muted flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg p-2">
                  {edu.logo?.url ? (
                    <Image
                      src={edu.logo.url}
                      alt={title}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  ) : (
                    <div className="text-muted-foreground text-xs font-bold">
                      {title.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-muted-foreground text-xs">{dateRange}</p>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {edu.achievements.length} achievements
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                  className="text-destructive hover:bg-destructive/10 h-8 w-8"
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
          <div className="text-muted-foreground py-12 text-center text-sm">
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
