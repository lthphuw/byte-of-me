'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDeleteDialog,
  DeleteButton,
  EditButton,
  Loading,
} from '@byte-of-me/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

import { EducationDialog } from './education-dialog';

import type { AdminEducation } from '@/entities/education';
import { createEducation } from '@/entities/education/api/create-education';
import { deleteEducation } from '@/entities/education/api/delete-education';
import { getAllAdminEducations } from '@/entities/education/api/get-all-admin-educations';
import { updateEducation } from '@/entities/education/api/update-education';
import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { formatDate } from '@/shared/lib/utils';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function EducationManager() {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminEducation | null>(null);
  const [open, setOpen] = useState(false);
  const [eduToDelete, setEduToDelete] = useState<AdminEducation | null>(null);

  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['educations'],
    queryFn: getAllAdminEducations,
  });

  const educations = response?.success ? response.data : [];

  const saveMutation = useMutation({
    mutationFn: (values: EducationFormValues) =>
      editing ? updateEducation(editing.id, values) : createEducation(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educations'] });
      toast(editing ? 'Education updated' : 'Education created');
      setOpen(false);
    },
    onError: () =>
      toast.error('Error saving education'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEducation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educations'] });
      toast('Education removed');
      setEduToDelete(null);
    },
    onError: () =>
      toast.error('Error deleting education'),
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
      <ManagerPageHeader
        title="Education"
        description="Manage your academic background"
        action={
          <Button onClick={handleCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Education
          </Button>
        }
      />

      <div className="relative min-h-[200px] space-y-4">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isEmpty={educations.length === 0}
          emptyTitle="No education entries"
          emptyDescription="Start by adding your first academic achievement."
          emptyAction={
            <Button variant="outline" size="sm" onClick={handleCreate}>
              Add Your First Entry
            </Button>
          }
          skeleton={
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <Loading />
              <p className="animate-pulse text-xs text-muted-foreground">
                Loading records...
              </p>
            </div>
          }
        >
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
                  className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {edu.logo?.url ? (
                        <Image
                          src={edu.logo.url}
                          alt={title}
                          fill
                          className="object-contain p-2"
                        />
                      ) : (
                        <GraduationCap className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-semibold leading-none">{title}</h4>
                      <p className="text-xs font-medium text-muted-foreground">
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
                      isSubmitting={
                        deleteMutation.isPending && eduToDelete?.id === edu.id
                      }
                      onClick={() => setEduToDelete(edu)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ManagerListState>

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

      <ConfirmDeleteDialog
        isOpen={!!eduToDelete}
        isLoading={deleteMutation.isPending}
        onClose={() => setEduToDelete(null)}
        onConfirm={() => eduToDelete && deleteMutation.mutate(eduToDelete.id)}
        description={`Are you sure you want to delete "${
          eduToDelete?.translations?.[0]?.title || 'Untitled Education'
        }"?`}
      />
    </div>
  );
}
