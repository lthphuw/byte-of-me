'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button ,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage, fromEditorContent, MultiSelect, toEditorContent } from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';

import { uploadSingleMedia } from '@/entities';
import {
  type AdminProject,
  type ProjectFromValues,
  projectSchema,
} from '@/entities/project/model';
import { getPaginatedAdminTags } from '@/entities/tag/api/get-paginated-admin-tags';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Nullable<AdminProject>;
  onSubmit: (values: ProjectFromValues) => void;
  loading: boolean;
}

export function ProjectDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: ProjectDialogProps) {
  const { data: tagsData } = useQuery({
    queryKey: ['admin-tags-list', 1],
    queryFn: () => getPaginatedAdminTags(1, 100),
    enabled: open,
  });

  const { data: techData } = useQuery({
    queryKey: ['admin-techstacks-list'],
    queryFn: () => getAllAdminTechStack(),
    enabled: open,
  });

  const tagOptions =
    tagsData?.data?.data.map((t) => ({
      label: t.translations?.[0]?.name || 'Unknown',
      value: t.id,
    })) || [];
  const techOptions =
    techData?.data?.map((t) => ({ label: t.name, value: t.id })) || [];

  const form = useForm<ProjectFromValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      slug: '',
      githubLink: '',
      liveLink: '',
      startDate: '',
      endDate: '',
      isPublished: false,
      techStackIds: [],
      tagIds: [],
      coauthors: [],
      translations: [{ language: 'en', title: '', description: '' }],
    },
  });

  const {
    fields: coauthorFields,
    append: appendCoauthor,
    remove: removeCoauthor,
  } = useFieldArray({
    control: form.control,
    name: 'coauthors',
  });

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        ...initialData,
        githubLink: initialData.githubLink || '',
        liveLink: initialData.liveLink || '',
        // <input type="date"> only accepts yyyy-MM-dd — a full ISO string
        // renders as an empty field.
        startDate: initialData.startDate?.toISOString().slice(0, 10) || '',
        endDate: initialData.endDate?.toISOString().slice(0, 10) || '',
        isPublished: initialData.isPublished,
        techStackIds: initialData.techStacks?.map((t) => t.techStackId) || [],
        tagIds: initialData.tags?.map((t) => t.tagId) || [],
        coauthors:
          initialData.coauthors?.map((c) => ({
            fullName: c.coauthor.fullName,
            email: c.coauthor.email || '',
          })) || [],
        translations: initialData.translations.map((t) => ({
          language: t.language,
          title: t.title,
          description: t.description || '',
        })),
      });
    } else if (!initialData && open) {
      form.reset({
        slug: '',
        githubLink: '',
        liveLink: '',
        startDate: '',
        endDate: '',
        isPublished: false,
        techStackIds: [],
        tagIds: [],
        coauthors: [],
        translations: [{ language: 'en', title: '', description: '' }],
      });
    }
  }, [initialData, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Same shell as the education dialog: fixed header and footer around a
          scrolling body. `min-w-0` on that body is load-bearing — without it
          the flex item sizes to the editor toolbar's button row and drags the
          dialog past its own max-width (horizontal overflow). */}
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14 text-left">
          <DialogTitle>
            {initialData ? 'Edit Project' : 'New Project'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-w-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                control={form.control}
                name="slug"
                label="Slug"
                placeholder="my-awesome-project"
              />
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  control={form.control}
                  name="startDate"
                  label="Start Date"
                  type="date"
                />
                <TextField
                  control={form.control}
                  name="endDate"
                  label="End Date"
                  type="date"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                control={form.control}
                name="githubLink"
                label="GitHub Link"
                placeholder="https://github.com/..."
              />
              <TextField
                control={form.control}
                name="liveLink"
                label="Live Link"
                placeholder="https://..."
              />
            </div>

            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Published</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="techStackIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tech Stack</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={techOptions}
                        selected={field.value || []}
                        onValueChange={field.onChange}
                        placeholder="Select tech stack"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags Selection */}
              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={tagOptions}
                        selected={field.value || []}
                        onValueChange={field.onChange}
                        placeholder="Select tags"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Co-authors</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => appendCoauthor({ fullName: '', email: '' })}
                >
                  <Plus /> Add Co-author
                </Button>
              </div>

              {coauthorFields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_1fr_auto]"
                >
                  <TextField
                    control={form.control}
                    name={`coauthors.${index}.fullName`}
                    label="Name"
                    placeholder="Jane Doe"
                  />
                  <TextField
                    control={form.control}
                    name={`coauthors.${index}.email`}
                    label="Email"
                    type="email"
                    placeholder="jane@example.com"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="md:mt-8"
                    onClick={() => removeCoauthor(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-4 border-t pt-4">
              <span className="text-sm font-medium">Content Translations</span>

              <TranslationTabs
                control={form.control}
                name="translations"
                newTranslation={() => ({
                  language: '',
                  title: '',
                  description: '',
                })}
                renderFields={(index) => (
                  <>
                    <TextField
                      control={form.control}
                      name={`translations.${index}.title`}
                      label="Title"
                    />
                    <FormField
                      control={form.control}
                      name={`translations.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <RichTextEditor
                            compact
                            minHeight={140}
                            placeholder="What this project is, and what it does…"
                            className="rounded-md"
                            value={toEditorContent(field.value)}
                            onChange={(json) =>
                              field.onChange(fromEditorContent(json))
                            }
                            uploadImage={uploadSingleMedia}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              />
            </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t bg-muted/30 px-6 py-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto"
              >
                {loading ? 'Saving...' : 'Save Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
