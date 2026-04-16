'use client';

import { useState } from 'react';
import {
  createProject,
  deleteProject,
  getPaginatedAdminProjects,
  updateProject,
} from '@/entities';
import type { AdminProject, ProjectFromValues } from '@/entities/project/model';
import { ProjectEditorCard } from '@/entities/project/ui/project-editor-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Empty, EmptyDescription, EmptyHeader } from '@/shared/ui/empty';
import Loading from '@/shared/ui/loading';
import { Pagination } from '@/shared/ui/pagination';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { ProjectDialog } from './project-dialog';

export function ProjectManager() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminProject | null>(null);
  const [open, setOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['projects', page],
    queryFn: () => getPaginatedAdminProjects(page, 12),
  });

  const saveMutation = useMutation({
    mutationFn: (values: ProjectFromValues) =>
      editing ? updateProject(editing.id, values) : createProject(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectToDelete(null);
    },
  });

  const projects = data?.data?.data || [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loading />
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full flex justify-center py-20">
            <Empty>
              <EmptyHeader>No projects found</EmptyHeader>
              <EmptyDescription>
                Create your first project to showcase your work.
              </EmptyDescription>
            </Empty>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectEditorCard
              key={project.id}
              project={project}
              onEdit={(p) => {
                setEditing(p);
                setOpen(true);
              }}
              onDelete={(id) => setProjectToDelete(id)}
              isPending={deleteMutation.isPending}
            />
          ))
        )}
      </div>

      <Pagination
        pagination={meta}
        setPage={setPage}
        isPlaceholderData={isPlaceholderData}
      />

      <ProjectDialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setEditing(null);
        }}
        initialData={editing!}
        onSubmit={(values) =>
          saveMutation.mutate({
            ...values,
            techStackIds: values.techStackIds || [],
            tagIds: values.tagIds || [],
          })
        }
        loading={saveMutation.isPending}
      />

      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={() => setProjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              project and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (projectToDelete) deleteMutation.mutate(projectToDelete);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
