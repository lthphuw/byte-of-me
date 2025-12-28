'use client';

import { useState } from 'react';
import {
  Coauthor,
  Prisma,
  Tag,
  TechStack,
} from '@repo/db/generated/prisma/client';
import { format } from 'date-fns';
import { EditorState, RichUtils, getDefaultKeyBinding } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import { CalendarIcon, Trash } from 'lucide-react';

import {
  addProject,
  deleteProject,
  updateProject,
} from '@/lib/actions/project';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
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
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    githubLink: '',
    liveLink: '',
    startDate: '',
    endDate: '',
    techStackIds: [] as string[],
    tagIds: [] as string[],
    coauthorIds: [] as string[],
  });
  const [descriptionState, setDescriptionState] = useState(
    EditorState.createEmpty()
  );
  const [newTagName, setNewTagName] = useState('');
  const [newCoauthor, setNewCoauthor] = useState({ fullname: '', email: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTechStackChange = (id: string, checked: boolean) => {
    const updatedIds = checked
      ? [...formData.techStackIds, id]
      : formData.techStackIds.filter((techId) => techId !== id);
    setFormData({ ...formData, techStackIds: updatedIds });
  };

  const handleTagChange = (id: string, checked: boolean) => {
    const updatedIds = checked
      ? [...formData.tagIds, id]
      : formData.tagIds.filter((tagId) => tagId !== id);
    setFormData({ ...formData, tagIds: updatedIds });
  };

  const addNewTag = () => {
    if (newTagName.trim()) {
      toast({ title: 'Info', description: 'New tag added (simulate)' });
      setNewTagName('');
    }
  };

  const handleCoauthorChange = (id: string, checked: boolean) => {
    const updatedIds = checked
      ? [...formData.coauthorIds, id]
      : formData.coauthorIds.filter((coId) => coId !== id);
    setFormData({ ...formData, coauthorIds: updatedIds });
  };

  const addNewCoauthor = () => {
    if (newCoauthor.fullname.trim()) {
      toast({ title: 'Info', description: 'New coauthor added (simulate)' });
      setNewCoauthor({ fullname: '', email: '' });
    }
  };

  const handleSubmit = async () => {
    try {
      const descriptionHTML = stateToHTML(descriptionState.getCurrentContent());

      const data = {
        slug: formData.slug,
        title: formData.title,
        description: descriptionHTML,
        githubLink: formData.githubLink || null,
        liveLink: formData.liveLink || null,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        techStackIds: formData.techStackIds,
        tagIds: formData.tagIds,
        coauthorIds: formData.coauthorIds,
      };

      let updatedProject: Project;
      if (selectedProject) {
        updatedProject = await updateProject({
          id: selectedProject.id,
          ...data,
        });
      } else {
        updatedProject = await addProject(data);
      }

      if (updatedProject) {
        const updatedList = selectedProject
          ? projects.map((proj) =>
              proj.id === selectedProject.id ? updatedProject : proj
            )
          : [...projects, updatedProject];

        setProjects(updatedList);
        toast({
          title: 'Success',
          description: `Project ${
            selectedProject ? 'updated' : 'added'
          } successfully`,
        });
        resetForm();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save project',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const success = await deleteProject(deleteConfirmId);
      if (success) {
        setProjects(projects.filter((proj) => proj.id !== deleteConfirmId));
        toast({
          title: 'Success',
          description: 'Project deleted successfully',
        });
        setDeleteConfirmId(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
      setDeleteConfirmId(null);
    }
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setFormData({
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
      techStackIds: project.techstacks.map((t) => t.techstack.id),
      tagIds: project.tags.map((t) => t.tag.id),
      coauthorIds: project.coauthors.map((c) => c.coauthor.id),
    });
    setDescriptionState(
      project.description
        ? EditorState.createWithContent(stateFromHTML(project.description))
        : EditorState.createEmpty()
    );
  };

  const openAddDialog = () => {
    resetForm();
    setIsAdding(true);
    setDescriptionState(EditorState.createEmpty());
  };

  const resetForm = () => {
    setSelectedProject(null);
    setIsAdding(false);
    setFormData({
      slug: '',
      title: '',
      githubLink: '',
      liveLink: '',
      startDate: '',
      endDate: '',
      techStackIds: [],
      tagIds: [],
      coauthorIds: [],
    });
    setDescriptionState(EditorState.createEmpty());
    setNewTagName('');
    setNewCoauthor({ fullname: '', email: '' });
  };

  const handleKeyCommand = (command: string, state: EditorState) => {
    const newState = RichUtils.handleKeyCommand(state, command);
    if (newState) {
      setDescriptionState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const mapKeyToEditorCommand = (e: React.KeyboardEvent): string | null => {
    if (e.keyCode === 9) {
      const newState = RichUtils.onTab(e, descriptionState, 4);
      if (newState !== descriptionState) {
        setDescriptionState(newState);
      }
      return null;
    }
    return getDefaultKeyBinding(e);
  };

  return (
    <div className="space-y-6">
      <Button onClick={openAddDialog}>Add New Project</Button>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="overflow-hidden cursor-pointer relative"
            onClick={() => openEditDialog(project)}
          >
            <CardHeader>
              <CardTitle>{project.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-sm truncate"
                dangerouslySetInnerHTML={{
                  __html: project.description || 'No description',
                }}
              />
              <p className="text-sm">
                Tech:{' '}
                {project.techstacks.map((t) => t.techstack.name).join(', ')}
              </p>
              <p className="text-sm">
                Tags: {project.tags.map((t) => t.tag.name).join(', ')}
              </p>
              <p className="text-sm">
                Coauthors:{' '}
                {project.coauthors.map((c) => c.coauthor.fullname).join(', ')}
              </p>
              <p className="text-sm">Blogs: {project.blogs.length}</p>
            </CardContent>

            <TrashButton
              className="absolute top-2 right-2"
              removeFunc={() => {
                setDeleteConfirmId(project.id);
              }}
            />
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedProject || isAdding} onOpenChange={resetForm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProject ? 'Edit' : 'Add'} Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Rich Text)</Label>
              <RichTextEditor
                editorState={descriptionState}
                onChange={setDescriptionState}
                placeholder="Enter description..."

              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="githubLink">GitHub Link</Label>
                <Input
                  id="githubLink"
                  name="githubLink"
                  value={formData.githubLink}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="liveLink">Live Link</Label>
                <Input
                  id="liveLink"
                  name="liveLink"
                  value={formData.liveLink}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? (
                        format(new Date(formData.startDate), 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        formData.startDate
                          ? new Date(formData.startDate)
                          : undefined
                      }
                      onSelect={(date) =>
                        setFormData({
                          ...formData,
                          startDate: date ? format(date, 'yyyy-MM-dd') : '',
                        })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? (
                        format(new Date(formData.endDate), 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        formData.endDate
                          ? new Date(formData.endDate)
                          : undefined
                      }
                      onSelect={(date) =>
                        setFormData({
                          ...formData,
                          endDate: date ? format(date, 'yyyy-MM-dd') : '',
                        })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tech Stacks</Label>
              <div className="grid grid-cols-3 gap-2">
                {availableTechStacks.map((tech) => (
                  <div key={tech.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tech-${tech.id}`}
                      checked={formData.techStackIds.includes(tech.id)}
                      onCheckedChange={(checked) =>
                        handleTechStackChange(tech.id, checked as boolean)
                      }
                    />
                    <label htmlFor={`tech-${tech.id}`}>{tech.name}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="grid grid-cols-3 gap-2">
                {availableTags.map((tag) => (
                  <div key={tag.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={formData.tagIds.includes(tag.id)}
                      onCheckedChange={(checked) =>
                        handleTagChange(tag.id, checked as boolean)
                      }
                    />
                    <label htmlFor={`tag-${tag.id}`}>{tag.name}</label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="New tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <Button onClick={addNewTag}>Add New Tag</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Coauthors</Label>
              <div className="grid grid-cols-3 gap-2">
                {availableCoauthors.map((co) => (
                  <div key={co.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`co-${co.id}`}
                      checked={formData.coauthorIds.includes(co.id)}
                      onCheckedChange={(checked) =>
                        handleCoauthorChange(co.id, checked as boolean)
                      }
                    />
                    <label htmlFor={`co-${co.id}`}>{co.fullname}</label>
                  </div>
                ))}
              </div>
              <div className="space-y-2 mt-2">
                <Input
                  placeholder="Fullname"
                  value={newCoauthor.fullname}
                  onChange={(e) =>
                    setNewCoauthor({ ...newCoauthor, fullname: e.target.value })
                  }
                />
                <Input
                  placeholder="Email (optional)"
                  value={newCoauthor.email}
                  onChange={(e) =>
                    setNewCoauthor({ ...newCoauthor, email: e.target.value })
                  }
                />
                <Button onClick={addNewCoauthor}>Add New Coauthor</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
