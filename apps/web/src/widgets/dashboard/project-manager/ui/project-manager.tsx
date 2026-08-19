'use client';

import { Button, ConfirmDeleteDialog, Pagination } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProjectDialog } from './project-dialog';

import {
  createProject,
  deleteProject,
  getPaginatedAdminProjects,
  updateProject,
} from '@/entities/project';
import type { AdminProject, ProjectFromValues } from '@/entities/project/model';
import { projectKeys } from '@/entities/project/model/query-keys';
import { ProjectEditorCard } from '@/entities/project/ui/project-editor-card';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function ProjectManager() {
  const t = useTranslations('dashboard.project');
  const tShared = useTranslations('dashboard.shared');
  const {
    items: projects,
    pagination,
    isLoading,
    isError,
    refetch,
    isFetching,
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
    queryKey: projectKeys.adminList(),
    entityLabel: 'Project',
    messages: {
      created: t('toast.created'),
      updated: t('toast.updated'),
      deleted: t('toast.deleted'),
      saveError: t('toast.saveError'),
      deleteError: t('toast.deleteError'),
    },
    pageSize: 12,
    fetchPage: (page, limit) => getPaginatedAdminProjects(page, limit),
    create: createProject,
    update: updateProject,
    remove: deleteProject,
  });

  const newProjectButton = (
    <Button size="sm" onClick={openCreateDialog}>
      <Plus className="mr-2 h-4 w-4" />
      {t('createButton')}
    </Button>
  );

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={newProjectButton}
      />

      {/* `relative` so ManagerListState's background-refetch spinner has
          something to anchor to while paging keeps the previous page. */}
      <div className="relative min-h-[200px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={projects.length === 0}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          emptyAction={newProjectButton}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectEditorCard
                key={project.id}
                project={project}
                labels={{
                  noDescription: t('card.noDescription'),
                  edit: t('editLabel', { name: project.slug }),
                  delete: t('deleteLabel', { name: project.slug }),
                  githubLink: t('card.githubLinkLabel', {
                    name: project.slug,
                  }),
                  liveLink: t('card.liveLinkLabel', { name: project.slug }),
                }}
                onEdit={openEditDialog}
                onDelete={() => requestDelete(project)}
                isPending={isDeletingItem(project)}
              />
            ))}
          </div>
        </ManagerListState>
      </div>

      {projects.length > 0 && (
        <Pagination
          pagination={pagination}
          setPage={setPage}
          isPlaceholderData={isPlaceholderData}
          pageLabel={tShared('pagination.pageLabel', {
            page: pagination?.currentPage ?? 1,
            totalPages: pagination?.totalPages ?? 1,
          })}
          previousLabel={tShared('pagination.previous')}
          nextLabel={tShared('pagination.next')}
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
        title={t('deleteTitle')}
        description={t('deleteDescription')}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
