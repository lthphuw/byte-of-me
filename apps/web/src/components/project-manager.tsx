'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type {
  Coauthor,
  Prisma,
  Tag,
  TechStack,
} from '@repo/db/generated/prisma/client';
import { format } from 'date-fns';
import { EditorState } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import { useForm } from 'react-hook-form';

import {
  addProject,
  deleteProject,
  updateProject,
} from '@/lib/actions/project';
import { ProjectForm, projectSchema } from '@/lib/schemas/project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { RichText } from '@/components/rich-text';
import { RichTextEditor } from '@/components/rich-text-editor';
import { TrashButton } from '@/components/trash-button';

type Project = Prisma.ProjectGetPayload<{
  include: {
    techstacks: { include: { techstack: true } };
    tags: { include: { tag: true } };
    coauthors: { include: { coauthor: true } };
    blogs: true;
  };
}>;

export function ProjectManager({
  initialProjects,
  availableTechStacks,
  availableTags,
  availableCoauthors,
}: {
  initialProjects: Project[];
  availableTechStacks: TechStack[];
  availableTags: Tag[];
  availableCoauthors: Coauthor[];
}) {
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [descriptionState, setDescriptionState] = useState(
    EditorState.createEmpty()
  );

  const form = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      slug: '',
      title: '',
      githubLink: '',
      liveLink: '',
      startDate: '',
      endDate: '',
      techStackIds: [],
      tagIds: [],
      coauthorIds: [],
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { isSubmitting },
  } = form;

  const resetForm = () => {
    reset();
    setSelectedProject(null);
    setIsAdding(false);
    setDescriptionState(EditorState.createEmpty());
  };

  const openAddDialog = () => {
    resetForm();
    setIsAdding(true);
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);

    reset({
      slug: project.slug,
      title: project.title,
      githubLink: project.githubLink || '',
      liveLink: project.liveLink || '',
      startDate: project.startDate
        ? format(new Date(project.startDate), 'yyyy-MM-dd')
        : '',
      endDate: project.endDate
        ? format(new Date(project.endDate), 'yyyy-MM-dd')
        : '',
      techStackIds: project.techstacks?.map((t) => t.techstack.id) || [],
      tagIds: project.tags?.map((t) => t.tag.id) || [],
      coauthorIds: project.coauthors?.map((c) => c.coauthor.id) || [],
    });

    setDescriptionState(
      project.description
        ? EditorState.createWithContent(stateFromHTML(project.description))
        : EditorState.createEmpty()
    );
  };

  const onSubmit = async (values: ProjectForm) => {
    try {
      const descriptionHTML = stateToHTML(descriptionState.getCurrentContent());

      const payload = {
        ...values,
        description: descriptionHTML,
        startDate: values.startDate ? new Date(values.startDate) : null,
        endDate: values.endDate ? new Date(values.endDate) : null,
      };

      const updated = selectedProject
        ? await updateProject({ id: selectedProject.id, ...payload })
        : await addProject(payload);

      setProjects((prev) =>
        selectedProject
          ? prev.map((p) => (p.id === updated.id ? updated : p))
          : [...prev, updated]
      );

      toast({
        title: 'Success',
        description: `Project ${
          selectedProject ? 'updated' : 'added'
        } successfully`,
      });

      resetForm();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save project',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    await deleteProject(deleteConfirmId);
    setProjects((p) => p.filter((i) => i.id !== deleteConfirmId));
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      <Button onClick={openAddDialog}>Add New Project</Button>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="relative cursor-pointer"
            onClick={() => openEditDialog(project)}
          >
            <CardHeader>
              <CardTitle>{project.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <RichText html={project.description} className={'line-clamp-3'} />
            </CardContent>
            <TrashButton
              className="absolute top-2 right-2"
              removeFunc={() => setDeleteConfirmId(project.id)}
            />
          </Card>
        ))}
      </div>

      {/* ADD / EDIT */}
      <Dialog open={!!selectedProject || isAdding} onOpenChange={resetForm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProject ? 'Edit' : 'Add'} Project
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={isSubmitting} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input {...register('title')} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input {...register('slug')} />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <RichTextEditor
                  editorState={descriptionState}
                  onChange={setDescriptionState}
                  placeholder="Enter description..."
                />
              </div>

              <div className="space-y-2">
                <Label>GitHub</Label>
                <Input {...register('githubLink')} />
              </div>
              <div className="space-y-2">
                <Label>Live</Label>
                <Input {...register('liveLink')} />
              </div>

              <div className="space-y-2">
                <Label>TechStacks: </Label>

                <div className="grid grid-cols-3 gap-2">
                  {availableTechStacks.map((tech) => (
                    <label key={tech.id} className="flex gap-2 items-center">
                      <Checkbox
                        checked={watch('techStackIds').includes(tech.id)}
                        onCheckedChange={(checked) =>
                          setValue(
                            'techStackIds',
                            checked
                              ? [...watch('techStackIds'), tech.id]
                              : watch('techStackIds').filter(
                                  (id) => id !== tech.id,
                                ),
                          )
                        }
                      />
                      {tech.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags: </Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableTags.map((tag) => (
                    <label key={tag.id} className="flex gap-2 items-center">
                      <Checkbox
                        checked={watch('tagIds')?.includes(tag.id)}
                        onCheckedChange={(checked) =>
                          setValue(
                            'tagIds',
                            checked
                              ? [...(watch('tagIds') || []), tag.id]
                              : (watch('tagIds') || []).filter(
                                  (id) => id !== tag.id
                                )
                          )
                        }
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
