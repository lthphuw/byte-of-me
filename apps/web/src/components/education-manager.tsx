'use client';

import { useRef, useState } from 'react';
import { Editor, EditorState, RichUtils, getDefaultKeyBinding } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import { Plus, Trash } from 'lucide-react';

import {
  addEducation,
  deleteEducation,
  updateEducation,
} from '@/lib/actions/education';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import Image from 'next/image';
import { Prisma } from '@repo/db/generated/prisma/client';

import { RichTextEditor } from '@/components/rich-text-editor';

type Education = Prisma.EducationGetPayload<{
  include: { subItems: true };
}>;

export function EducationManager({
  initialEducations,
}: {
  initialEducations: Education[];
}) {
  const { toast } = useToast();
  const [educations, setEducations] = useState<Education[]>(initialEducations);
  const [selectedEducation, setSelectedEducation] = useState<Education | null>(
    null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    timeline: '',
    title: '',
    icon: '',
    subItems: [] as { title: string; message: string }[],
  });
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [subEditorStates, setSubEditorStates] = useState<EditorState[]>([]);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const editorRef = useRef<Editor>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setIconFile(e.target.files[0]);
    }
  };

  const addSubItem = () => {
    setFormData({
      ...formData,
      subItems: [...formData.subItems, { title: '', message: '' }],
    });
    setSubEditorStates([...subEditorStates, EditorState.createEmpty()]);
  };

  const updateSubItemTitle = (index: number, value: string) => {
    const updatedSubItems = [...formData.subItems];
    updatedSubItems[index].title = value;
    setFormData({ ...formData, subItems: updatedSubItems });
  };

  const deleteSubItem = (index: number) => {
    const updatedSubItems = formData.subItems.filter((_, i) => i !== index);
    const updatedStates = subEditorStates.filter((_, i) => i !== index);
    setFormData({ ...formData, subItems: updatedSubItems });
    setSubEditorStates(updatedStates);
  };

  const handleKeyCommand = (command: string, state: EditorState) => {
    const newState = RichUtils.handleKeyCommand(state, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const mapKeyToEditorCommand = (e: React.KeyboardEvent): string | null => {
    if (e.keyCode === 9) {
      const newEditorState = RichUtils.onTab(e, editorState, 4);
      if (newEditorState !== editorState) {
        setEditorState(newEditorState);
      }
      return null;
    }
    return getDefaultKeyBinding(e);
  };

  const handleSubEditorChange = (index: number, newState: EditorState) => {
    const updatedStates = [...subEditorStates];
    updatedStates[index] = newState;
    setSubEditorStates(updatedStates);
  };

  const handleSubmit = async () => {
    try {
      let iconBase64 = formData.icon;
      if (iconFile) {
        iconBase64 = await fileToBase64(iconFile);
      }

      const messageHTML = stateToHTML(editorState.getCurrentContent());

      const subItemsWithHTML = formData.subItems.map((sub, index) => ({
        ...sub,
        message: stateToHTML(subEditorStates[index].getCurrentContent()),
      }));

      const data = {
        timeline: formData.timeline,
        title: formData.title,
        message: messageHTML,
        icon: iconBase64,
        subItems: subItemsWithHTML,
      };

      let updatedEducation;
      if (selectedEducation) {
        updatedEducation = await updateEducation({
          id: selectedEducation.id,
          ...data,
        });
      } else {
        updatedEducation = await addEducation(data);
      }

      if (updatedEducation) {
        const updatedList = selectedEducation
          ? educations.map((edu) =>
              edu.id === selectedEducation.id ? updatedEducation : edu
            )
          : [...educations, updatedEducation];

        setEducations(updatedList);
        toast({
          title: 'Success',
          description: `Education ${
            selectedEducation ? 'updated' : 'added'
          } successfully`,
        });
        resetForm();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save education',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const success = await deleteEducation(deleteConfirmId);
      if (success) {
        setEducations(educations.filter((edu) => edu.id !== deleteConfirmId));
        toast({
          title: 'Success',
          description: 'Education deleted successfully',
        });
        setDeleteConfirmId(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete education',
        variant: 'destructive',
      });
      setDeleteConfirmId(null);
    }
  };

  const openEditDialog = (education: Education) => {
    setSelectedEducation(education);
    setFormData({
      timeline: education.timeline,
      title: education.title,
      icon: education.icon || '',
      subItems: education.subItems.map((sub) => ({
        title: sub.title,
        message: sub.message || '',
      })),
    });
    setEditorState(
      education.message
        ? EditorState.createWithContent(stateFromHTML(education.message))
        : EditorState.createEmpty()
    );
    setSubEditorStates(
      education.subItems.map((sub) =>
        sub.message
          ? EditorState.createWithContent(stateFromHTML(sub.message))
          : EditorState.createEmpty()
      )
    );
    setIconFile(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsAdding(true);
    setEditorState(EditorState.createEmpty());
    setSubEditorStates([]);
  };

  const resetForm = () => {
    setSelectedEducation(null);
    setIsAdding(false);
    setFormData({
      timeline: '',
      title: '',
      icon: '',
      subItems: [],
    });
    setEditorState(EditorState.createEmpty());
    setSubEditorStates([]);
    setIconFile(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="space-y-6">
      <Button onClick={openAddDialog}>Add New Education</Button>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {educations.map((education) => (
          <Card
            key={education.id}
            className="overflow-hidden cursor-pointer relative"
            onClick={() => openEditDialog(education)}
          >
            {education.icon && (
              <div className="relative w-12 h-12 mx-auto mt-4 object-center object-cover">
                <Image
                  src={education.icon}
                  alt="Icon"
                  className="object-center object-cover"
                  fill
                />
              </div>
            )}
            <CardHeader>
              <CardTitle>{education.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {education.timeline}
              </p>
              <p
                className="text-sm truncate"
                dangerouslySetInnerHTML={{
                  __html: education.message || 'No message',
                }}
              />
              <p className="text-sm">Subitems: {education.subItems.length}</p>
            </CardContent>
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(education.id);
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedEducation || isAdding} onOpenChange={resetForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEducation ? 'Edit' : 'Add'} Education
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={'font-bold'} htmlFor="timeline">
                  Timeline
                </Label>
                <Input
                  id="timeline"
                  name="timeline"
                  value={formData.timeline}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label className={'font-bold'} htmlFor="title">
                  Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={'font-bold'}>Message</Label>
              <RichTextEditor
                editorState={editorState}
                onChange={setEditorState}
                handleKeyCommand={handleKeyCommand}
                keyBindingFn={mapKeyToEditorCommand}
                placeholder="Enter message..."
                editorRef={editorRef}
              />
            </div>
            <div className="space-y-2">
              <Label className={'font-bold'} htmlFor="icon">
                Icon
              </Label>
              <Input
                id="icon"
                type="file"
                accept="image/*"
                onChange={handleIconChange}
              />
              {formData.icon && (
                <img
                  src={formData.icon}
                  alt="Icon Preview"
                  className="w-16 h-16"
                />
              )}
            </div>

            <div className="space-y-4 flex flex-col items-stretch">
              <div className="flex justify-between items-center">
                <Label className={'font-bold'}>Additional information: </Label>
              </div>

              {formData.subItems.map((sub, index) => (
                <Card key={index} className="p-4 relative">
                  <div className="space-y-2">
                    <Input
                      placeholder="Subitem Title"
                      value={sub.title}
                      onChange={(e) =>
                        updateSubItemTitle(index, e.target.value)
                      }
                    />
                    <RichTextEditor
                      editorState={subEditorStates[index]}
                      onChange={(newState) =>
                        handleSubEditorChange(index, newState)
                      }
                      handleKeyCommand={(command, state) => {
                        const newState = RichUtils.handleKeyCommand(
                          state,
                          command
                        );
                        if (newState) {
                          handleSubEditorChange(index, newState);
                          return 'handled';
                        }
                        return 'not-handled';
                      }}
                      keyBindingFn={(e) => {
                        if (e.keyCode === 9) {
                          const state = subEditorStates[index];
                          const newState = RichUtils.onTab(e, state, 4);
                          if (newState !== state) {
                            handleSubEditorChange(index, newState);
                          }
                          return null;
                        }
                        return getDefaultKeyBinding(e);
                      }}
                      placeholder="Enter subitem message..."
                      toolbarConfig={['H3', 'Bold', 'Italic', 'UL', 'OL']} // Customized for subitems
                    />
                  </div>

                  <Button
                    className="absolute top-2 right-2"
                    size="icon"
                    onClick={() => deleteSubItem(index)}
                  >
                    <Trash className={`h-4 w-4 text-destructive`} />
                  </Button>
                </Card>
              ))}

              <Button onClick={addSubItem} className={'self-center'}>
                <Plus /> Add more
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
              Are you sure you want to delete this education entry? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              No
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
