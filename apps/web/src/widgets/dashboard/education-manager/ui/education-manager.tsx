'use client';

import {
  Badge,
  Button,
  ConfirmDeleteDialog,
  DeleteButton,
  EditButton,
} from '@byte-of-me/ui';
import { GraduationCap, Plus } from 'lucide-react';
import Image from 'next/image';

import { EducationDialog } from './education-dialog';

import type { AdminEducation } from '@/entities/education';
import { createEducation } from '@/entities/education/api/create-education';
import { deleteEducation } from '@/entities/education/api/delete-education';
import { getAllAdminEducations } from '@/entities/education/api/get-all-admin-educations';
import { updateEducation } from '@/entities/education/api/update-education';
import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { educationKeys } from '@/entities/education/model/query-keys';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { formatDate } from '@/shared/lib/utils';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function EducationManager() {
  const {
    items: educations,
    isLoading,
    isError,
    refetch,
    isFetching,
    editing,
    isDialogOpen,
    onDialogOpenChange,
    openCreateDialog,
    openEditDialog,
    save,
    isSaving,
    itemToDelete: eduToDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    isDeletingItem,
  } = useCrudManager<AdminEducation, EducationFormValues>({
    queryKey: educationKeys.list(),
    entityLabel: 'Education',
    fetchAll: getAllAdminEducations,
    create: createEducation,
    update: updateEducation,
    remove: deleteEducation,
  });

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title="Education"
        description="Manage your academic background"
        action={
          <Button onClick={openCreateDialog} size="sm" className="gap-2">
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
          isFetching={isFetching}
          isEmpty={educations.length === 0}
          emptyTitle="No education entries"
          emptyDescription="Start by adding your first academic achievement."
          emptyAction={
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              Add Your First Entry
            </Button>
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
                  className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {edu.logo?.url ? (
                        <Image
                          src={edu.logo.url}
                          alt={title}
                          fill
                          sizes="56px"
                          className="object-contain p-2"
                        />
                      ) : (
                        <GraduationCap className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h4 className="truncate font-semibold leading-none">
                        {title}
                      </h4>
                      <p className="text-xs font-medium text-muted-foreground">
                        {dateRange}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge
                          variant="secondary"
                          className="px-2 py-0 text-[10px]"
                        >
                          {edu.achievements.length}{' '}
                          {edu.achievements.length === 1
                            ? 'Achievement'
                            : 'Achievements'}
                        </Badge>

                        {!edu.endDate && (
                          <Badge
                            variant="outline"
                            className="px-2 py-0 text-[10px]"
                          >
                            Ongoing
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                    <EditButton onClick={() => openEditDialog(edu)} />
                    <DeleteButton
                      isSubmitting={isDeletingItem(edu)}
                      onClick={() => requestDelete(edu)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ManagerListState>
      </div>

      <EducationDialog
        key={editing?.id || 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={editing}
        onSubmit={(values) => save(values)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!eduToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        description={`Are you sure you want to delete "${
          eduToDelete?.translations?.[0]?.title || 'Untitled Education'
        }"?`}
      />
    </div>
  );
}
