'use client';

import { useState } from 'react';
import { EditorState } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import { CalendarIcon, Plus, Trash } from 'lucide-react';

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

import 'draft-js/dist/Draft.css';
import { Prisma, TechStack } from '@repo/db/generated/prisma/client';
import { format } from 'date-fns';

import {
  addExperience,
  deleteExperience,
  updateExperience,
} from '@/lib/actions/experience';
import { FileHelper } from '@/lib/core/file-helper';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RichTextEditor } from '@/components/rich-text-editor';
import { TrashButton } from '@/components/trash-button';

type Experience = Prisma.ExperienceGetPayload<{
  include: {
    roles: {
      include: {
        tasks: true;
      };
    };
    techstacks: {
      include: {
        techstack: true;
      };
    };
  };
}>;

export function ExperienceManager({
  initialExperiences,
  availableTechStacks,
}: {
  initialExperiences: Experience[];
  availableTechStacks: TechStack[];
}) {
  const { toast } = useToast();
  const [experiences, setExperiences] =
    useState<Experience[]>(initialExperiences);
  const [selectedExperience, setSelectedExperience] =
    useState<Experience | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    logoUrl: '',
    location: '',
    type: '',
    roles: [] as {
      title: string;
      startDate: string;
      endDate?: string;
      tasks: { content: string }[];
    }[],
    techStackIds: [] as string[],
  });
  const [descriptionState, setDescriptionState] = useState(
    EditorState.createEmpty()
  );
  const [roleEditorStates, setRoleEditorStates] = useState<
    { tasks: EditorState[] }[]
  >([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const addRole = () => {
    setFormData({
      ...formData,
      roles: [
        ...formData.roles,
        { title: '', startDate: '', endDate: '', tasks: [] },
      ],
    });
    setRoleEditorStates([...roleEditorStates, { tasks: [] }]);
  };

  const updateRole = (
    index: number,
    field: 'title' | 'startDate' | 'endDate',
    value: string
  ) => {
    const updatedRoles = [...formData.roles];
    updatedRoles[index][field] = value;
    setFormData({ ...formData, roles: updatedRoles });
  };

  const deleteRole = (index: number) => {
    const updatedRoles = formData.roles.filter((_, i) => i !== index);
    const updatedStates = roleEditorStates.filter((_, i) => i !== index);
    setFormData({ ...formData, roles: updatedRoles });
    setRoleEditorStates(updatedStates);
  };

  const addTask = (roleIndex: number) => {
    const updatedRoles = [...formData.roles];
    updatedRoles[roleIndex].tasks.push({ content: '' });
    setFormData({ ...formData, roles: updatedRoles });

    const updatedStates = [...roleEditorStates];
    updatedStates[roleIndex].tasks.push(EditorState.createEmpty());
    setRoleEditorStates(updatedStates);
  };

  const deleteTask = (roleIndex: number, taskIndex: number) => {
    const updatedRoles = [...formData.roles];
    updatedRoles[roleIndex].tasks = updatedRoles[roleIndex].tasks.filter(
      (_, i) => i !== taskIndex
    );
    setFormData({ ...formData, roles: updatedRoles });

    const updatedStates = [...roleEditorStates];
    updatedStates[roleIndex].tasks = updatedStates[roleIndex].tasks.filter(
      (_, i) => i !== taskIndex
    );
    setRoleEditorStates(updatedStates);
  };

  const handleTaskEditorChange = (
    roleIndex: number,
    taskIndex: number,
    newState: EditorState
  ) => {
    const updatedStates = [...roleEditorStates];
    updatedStates[roleIndex].tasks[taskIndex] = newState;
    setRoleEditorStates(updatedStates);
  };

  const handleTechStackChange = (id: string, checked: boolean) => {
    const updatedIds = checked
      ? [...formData.techStackIds, id]
      : formData.techStackIds.filter((techId) => techId !== id);
    setFormData({ ...formData, techStackIds: updatedIds });
  };

  const handleSubmit = async () => {
    try {
      let logoBase64 = formData.logoUrl;
      if (logoFile) {
        logoBase64 = await FileHelper.fileToBase64(logoFile);
      }

      const descriptionHTML = stateToHTML(descriptionState.getCurrentContent());

      const rolesWithHTML = formData.roles.map((role, roleIndex) => ({
        ...role,
        tasks: role.tasks.map((task, taskIndex) => ({
          content: stateToHTML(
            roleEditorStates[roleIndex].tasks[taskIndex].getCurrentContent()
          ),
        })),
      }));

      const data = {
        company: formData.company,
        logoUrl: logoBase64,
        location: formData.location,
        type: formData.type,
        description: descriptionHTML,
        roles: rolesWithHTML,
        techStackIds: formData.techStackIds,
      };

      let updatedExp;
      if (selectedExperience) {
        updatedExp = await updateExperience({
          id: selectedExperience.id,
          ...data,
        });
      } else {
        updatedExp = await addExperience(data);
      }

      if (updatedExp) {
        const updatedList = selectedExperience
          ? experiences.map((exp) =>
              exp.id === selectedExperience.id ? updatedExp : exp
            )
          : [...experiences, updatedExp];

        setExperiences(updatedList);
        toast({
          title: 'Success',
          description: `Experience ${
            selectedExperience ? 'updated' : 'added'
          } successfully`,
        });
        resetForm();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save experience',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const success = await deleteExperience(deleteConfirmId);
      if (success) {
        setExperiences(experiences.filter((exp) => exp.id !== deleteConfirmId));
        toast({
          title: 'Success',
          description: 'Experience deleted successfully',
        });
        setDeleteConfirmId(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete experience',
        variant: 'destructive',
      });
      setDeleteConfirmId(null);
    }
  };

  const openEditDialog = (experience: Experience) => {
    setSelectedExperience(experience);
    setFormData({
      company: experience.company,
      logoUrl: experience.logoUrl,
      location: experience.location,
      type: experience.type,
      roles: experience.roles.map((role) => ({
        title: role.title,
        startDate: format(new Date(role.startDate), 'yyyy-MM-dd'),
        endDate: role.endDate
          ? format(new Date(role.endDate), 'yyyy-MM-dd')
          : '',
        tasks: role.tasks.map((task) => ({ content: task.content })),
      })),
      techStackIds: experience.techstacks.map((t) => t.techstack.id),
    });
    setDescriptionState(
      experience.description
        ? EditorState.createWithContent(stateFromHTML(experience.description))
        : EditorState.createEmpty()
    );
    setRoleEditorStates(
      experience.roles.map((role) => ({
        tasks: role.tasks.map((task) =>
          task.content
            ? EditorState.createWithContent(stateFromHTML(task.content))
            : EditorState.createEmpty()
        ),
      }))
    );
    setLogoFile(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsAdding(true);
    setDescriptionState(EditorState.createEmpty());
    setRoleEditorStates([]);
  };

  const resetForm = () => {
    setSelectedExperience(null);
    setIsAdding(false);
    setFormData({
      company: '',
      logoUrl: '',
      location: '',
      type: '',
      roles: [],
      techStackIds: [],
    });
    setDescriptionState(EditorState.createEmpty());
    setRoleEditorStates([]);
    setLogoFile(null);
  };

  return (
    <div className="space-y-6">
      <Button onClick={openAddDialog}>Add New Experience</Button>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {experiences.map((experience) => (
          <Card
            key={experience.id}
            className="overflow-hidden cursor-pointer relative"
            onClick={() => openEditDialog(experience)}
          >
            {experience.logoUrl && (
              <img
                src={experience.logoUrl}
                alt="Logo"
                className="w-12 h-12 mx-auto mt-4"
              />
            )}
            <CardHeader>
              <CardTitle>{experience.company}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {experience.location} - {experience.type}
              </p>
              <p
                className="text-sm truncate"
                dangerouslySetInnerHTML={{
                  __html: experience.description || 'No description',
                }}
              />
              <p className="text-sm">Roles: {experience.roles.length}</p>
              <p className="text-sm">
                {`Tech: ${
                  experience.techstacks.length > 0
                    ? experience.techstacks
                        .map((t) => t.techstack.name)
                        .join(', ')
                    : 'None'
                }`}
              </p>
            </CardContent>

            <TrashButton
              className="absolute top-2 right-2"
              removeFunc={() => {
                setDeleteConfirmId(experience.id);
              }}
            />
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedExperience || isAdding} onOpenChange={resetForm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedExperience ? 'Edit' : 'Add'} Experience
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo</Label>
                <div className="flex gap-2 ">
                  <Input
                    id="logoUrl"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                  />

                  {formData.logoUrl && (
                    <img
                      src={formData.logoUrl}
                      alt="Logo Preview"
                      className="w-16 h-16"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor
                editorState={descriptionState}
                onChange={setDescriptionState}
                placeholder="Enter description..."
              />
            </div>
            <div className="space-y-4">
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
            <div className="space-y-4 flex flex-col items-stretch">
              <div className="flex justify-between items-center">
                <Label>Roles</Label>
              </div>

              {formData.roles.map((role, roleIndex) => (
                <Card key={roleIndex} className="p-4 relative">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`role-title-${roleIndex}`}>Title</Label>
                        <Input
                          id={`role-title-${roleIndex}`}
                          value={role.title}
                          onChange={(e) =>
                            updateRole(roleIndex, 'title', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {role.startDate ? (
                                format(new Date(role.startDate), 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={
                                role.startDate
                                  ? new Date(role.startDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                updateRole(
                                  roleIndex,
                                  'startDate',
                                  date ? format(date, 'yyyy-MM-dd') : ''
                                )
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
                              {role.endDate ? (
                                format(new Date(role.endDate), 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={
                                role.endDate
                                  ? new Date(role.endDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                updateRole(
                                  roleIndex,
                                  'endDate',
                                  date ? format(date, 'yyyy-MM-dd') : ''
                                )
                              }
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-4 flex flex-col gap-2 items-stretch">
                      <div className="flex justify-between items-center">
                        <Label>Tasks</Label>
                      </div>
                      {role.tasks.map((task, taskIndex) => (
                        <div key={taskIndex} className="relative">
                          <RichTextEditor
                            editorState={
                              roleEditorStates[roleIndex]?.tasks[taskIndex] ||
                              EditorState.createEmpty()
                            }
                            onChange={(newState) =>
                              handleTaskEditorChange(
                                roleIndex,
                                taskIndex,
                                newState
                              )
                            }
                            placeholder="Enter task content..."
                          />

                          <TrashButton
                            className="absolute top-2 right-8"
                            removeFunc={() => deleteTask(roleIndex, taskIndex)}
                          />
                        </div>
                      ))}
                      <Button
                        className={'self-center'}
                        onClick={() => addTask(roleIndex)}
                      >
                        <Plus /> Add Task
                      </Button>
                    </div>
                  </div>

                  <TrashButton
                    className="absolute top-2 right-2"
                    removeFunc={() => deleteRole(roleIndex)}
                  />
                </Card>
              ))}

              <Button className={'self-center'} onClick={addRole}>
                <Plus /> Add Role
              </Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this experience? This action
              cannot be undone.
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
