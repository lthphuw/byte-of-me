'use client';

import { useState } from 'react';
import type { AdminEducation } from '@/entities/education';
import { createEducation } from '@/entities/education/api/create-education';
import { deleteEducation } from '@/entities/education/api/delete-education';
import { getAllAdminEducations } from '@/entities/education/api/get-all-admin-educations';
import { updateEducation } from '@/entities/education/api/update-education';
import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { useToast } from '@/shared/hooks/use-toast';
import { formatDate } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { DeleteButton } from '@/shared/ui/delete-button';
import { EditButton } from '@/shared/ui/edit-button';
import Loading from '@/shared/ui/loading';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Inbox, Plus } from 'lucide-react';
import Image from 'next/image';

import { EducationDialog } from './education-dialog';

export function EducationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminEducation | null>(null);
  const [open, setOpen] = useState(false);

  const {
    data: response,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['educations'],
    queryFn: getAllAdminEducations,
  });

  const educations = response?.success ? response.data : [];
  const isEmpty = !isLoading && educations.length === 0;

  const saveMutation = useMutation({
    mutationFn: (values: EducationFormValues) =>
      editing ? updateEducation(editing.id, values) : createEducation(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educations'] });
      toast({ title: editing ? 'Education updated' : 'Education created' });
      setOpen(false);
    },
    onError: () =>
      toast({ title: 'Error saving education', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEducation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educations'] });
      toast({ title: 'Education removed' });
    },
    onError: () =>
      toast({ title: 'Error deleting education', variant: 'destructive' }),
  });

  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (edu: AdminEducation) => {
    setEditing(edu);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Education</h2>
          <p className="text-muted-foreground text-sm">
            Manage your academic background
          </p>
        </div>
        <Button onClick={handleCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Education
        </Button>
      </div>

      <div className="relative min-h-[200px] space-y-4">
        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <Loading />
            <p className="text-muted-foreground animate-pulse text-xs">
              Loading records...
            </p>
          </div>
        ) : isEmpty ? (
          <div className="border-muted-foreground/20 flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center">
            <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Inbox className="text-muted-foreground h-6 w-6" />
            </div>
            <h3 className="font-medium">No education entries</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Start by adding your first academic achievement.
            </p>
            <Button variant="outline" size="sm" onClick={handleCreate}>
              Add Your First Entry
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {educations.map((edu) => {
              const title =
                edu.translations?.[0]?.title || 'Untitled Education';
              const dateRange = `${formatDate(edu.startDate)} — ${
                edu.endDate ? formatDate(edu.endDate) : 'Present'
              }`;

              return (
                <div
                  key={edu.id}
                  className="bg-card hover:border-primary/50 group flex items-center justify-between rounded-xl border p-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-muted relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                      {edu.logo?.url ? (
                        <Image
                          src={edu.logo.url}
                          alt={title}
                          fill
                          className="object-contain p-2"
                        />
                      ) : (
                        <GraduationCap className="text-muted-foreground h-6 w-6" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-semibold leading-none">{title}</h4>
                      <p className="text-muted-foreground text-xs font-medium">
                        {dateRange}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge
                          variant="secondary"
                          className="px-2 py-0 text-[10px]"
                        >
                          {edu.achievements.length} Achievements
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <EditButton onClick={() => handleEdit(edu)} />
                    <DeleteButton
                      isSubmitting={deleteMutation.isPending}
                      onClick={() => {
                        if (
                          confirm(`Are you sure you want to delete "${title}"?`)
                        ) {
                          deleteMutation.mutate(edu.id);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && isFetching && (
          <div className="absolute right-2 top-2">
            <Loading />
          </div>
        )}
      </div>

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
