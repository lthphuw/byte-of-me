'use client';

import { Button, ConfirmDeleteDialog, Pagination } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';

import { ProjectDialog } from './project-dialog';

import {
  createProject,
  deleteProject,
  getPaginatedAdminProjects,
  updateProject,
} from '@/entities';
import type { AdminProject, ProjectFromValues } from '@/entities/project/model';
import { ProjectEditorCard } from '@/entities/project/ui/project-editor-card';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function ProjectManager() {
  const {
    items: projects,
    pagination,
    isLoading,
    isError,
    refetch,
    isPlaceholderData,
    setPage,
    editing,
    isDialogOpen,
    onDialogOpenChange,
    openCreateDialog,
    openEditDialog,
    save,
    isSaving,
    itemToDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    isDeletingItem,
  } = useCrudManager<AdminProject, ProjectFromValues>({
    queryKey: 'projects',
    entityLabel: 'Project',
    pageSize: 12,
    fetchPage: (page, limit) => getPaginatedAdminProjects(page, limit),
    create: createProject,
    update: updateProject,
    remove: deleteProject,
  });

  const newProjectButton = (
    <Button size="sm" onClick={openCreateDialog}>
      <Plus className="mr-2 h-4 w-4" />
      New Project
    </Button>
  );

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title="Projects"
        description="Manage your portfolio gallery, case studies, and deployment links."
        action={newProjectButton}
      />

      <ManagerListState
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        isEmpty={projects.length === 0}
        emptyTitle="No projects found"
        emptyDescription="Create your first project to showcase your work."
        emptyAction={newProjectButton}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectEditorCard
              key={project.id}
              project={project}
              onEdit={openEditDialog}
              onDelete={() => requestDelete(project)}
              isPending={isDeletingItem(project)}
            />
          ))}
        </div>
      </ManagerListState>

      {projects.length > 0 && (
        <Pagination
          pagination={pagination}
          setPage={setPage}
          isPlaceholderData={isPlaceholderData}
        />
      )}

      <ProjectDialog
        key={editing?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={editing}
        onSubmit={(values) =>
          save({
            ...values,
            techStackIds: values.techStackIds || [],
            tagIds: values.tagIds || [],
          })
        }
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!itemToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Project?"
        description="This action cannot be undone. This will permanently delete the project and remove its data from our servers."
      />
    </div>
  );
}
