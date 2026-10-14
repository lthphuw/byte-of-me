'use client';

import { useLocale, useTranslations } from 'next-intl';

import { ProjectDialog } from './project-dialog';

import { createProject } from '@/entities/project/api/create-project';
import { deleteProject } from '@/entities/project/api/delete-project';
import { getPaginatedAdminProjects } from '@/entities/project/api/get-paginated-admin-projects';
import { updateProject } from '@/entities/project/api/update-project';
import {
  type AdminProject,
  adminProjectTitle,
  type ProjectFromValues,
  projectKeys,
} from '@/entities/project/model';
import { projectQueries, useAdminProjectById } from '@/entities/project/query';
import { ProjectEditorCard } from '@/entities/project/ui/project-editor-card';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';
import {
  AddButton,
  ConfirmDeleteDialog,
  ManagerListState,
  ManagerPageHeader,
  ManagerPagination,
  RecordListSkeleton,
} from '@/shared/ui';

export function ProjectManager() {
  const t = useTranslations('dashboard.project');
  const crud = useTranslations('dashboard.shared.crud');
  const locale = useLocale();
  const entity = t('entity');
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
  } = useCrudManager<AdminProject, ProjectFromValues>({
    entity,
    keys: projectKeys,
    pageSize: ADMIN_PAGE_SIZE,
    pageKey: (page) => projectQueries.adminPage(page).queryKey,
    fetchPage: getPaginatedAdminProjects,
    create: createProject,
    update: updateProject,
    remove: deleteProject,
  });

  // The list row is not the editor's source: the dialog loads the full record
  // by id. "New" (`editing` is null) fetches nothing.
  const fullProject = useAdminProjectById(editing?.id ?? null);

  const newProjectButton = (
    <AddButton label={t('createButton')} onClick={openCreateDialog} />
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
          skeleton={<RecordListSkeleton variant="grid" />}
          pagination={
            <ManagerPagination
              pagination={pagination}
              setPage={setPage}
              isPlaceholderData={isPlaceholderData}
              className="mt-6"
            />
          }
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
                  githubLink: t('card.githubLinkLabel', {
                    name: project.slug,
                  }),
                  liveLink: t('card.liveLinkLabel', { name: project.slug }),
                }}
                onEdit={openEditDialog}
                onDelete={() => requestDelete(project)}
              />
            ))}
          </div>
        </ManagerListState>
      </div>

      <ProjectDialog
        key={editing?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        isEditing={Boolean(editing)}
        initialData={fullProject.record}
        isLoadingInitialData={fullProject.isNotReady}
        hasLoadError={fullProject.hasError}
        onRetryLoad={fullProject.retry}
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
        open={!!itemToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={crud('deleteTitle', { entity })}
        description={crud('deleteDescription', {
          name: itemToDelete ? adminProjectTitle(itemToDelete, locale) : '',
        })}
      />
    </div>
  );
}
