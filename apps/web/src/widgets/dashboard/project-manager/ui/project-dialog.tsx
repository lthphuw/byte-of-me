'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';

import {
  type ProjectFromValues,
  projectSchema,
} from '@/entities/project/model';
import { getPaginatedAdminTags } from '@/entities/tag/api/get-paginated-admin-tags';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { Button ,
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
  FormMessage, Input , MultiSelect } from '@/shared/ui';
// Assuming you have a MultiSelect component
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Any;
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
      techStackIds: [],
      tagIds: [],
      translations: [{ language: 'en', title: '', description: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'translations',
  });

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        ...initialData,
        githubLink: initialData.githubLink || '',
        liveLink: initialData.liveLink || '',
        startDate: initialData.startDate || '',
        endDate: initialData.endDate || '',
        techStackIds:
          initialData.techStacks?.map((t: Any) => t.techStackId || t.id) || [],
        tagIds: initialData.tags?.map((t: Any) => t.tagId || t.id) || [],
        translations: initialData.translations || [
          { language: 'en', title: '', description: '' },
        ],
      });
    } else if (!initialData && open) {
      form.reset({
        slug: '',
        githubLink: '',
        liveLink: '',
        startDate: '',
        endDate: '',
        techStackIds: [],
        tagIds: [],
        translations: [{ language: 'en', title: '', description: '' }],
      });
    }
  }, [initialData, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Project' : 'New Project'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="my-awesome-project" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="githubLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub Link</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://github.com/..." />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="liveLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Live Link</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Content Translations
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ language: '', title: '', description: '' })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Language
                </Button>
              </div>

              <Tabs defaultValue={fields[0]?.id}>
                <TabsList className="justify-start overflow-x-auto">
                  {fields.map((field, index) => (
                    <TabsTrigger key={field.id} value={field.id}>
                      {form
                        .watch(`translations.${index}.language`)
                        ?.toUpperCase() || `New`}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {fields.map((field, index) => (
                  <TabsContent
                    key={field.id}
                    value={field.id}
                    className="space-y-4 rounded-lg border bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <FormField
                        control={form.control}
                        name={`translations.${index}.language`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Language Code (en, vi...)</FormLabel>
                            <Input {...field} placeholder="en" />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-8 text-destructive"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormField
                      control={form.control}
                      name={`translations.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <Input {...field} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`translations.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <Input {...field} />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            <DialogFooter>
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
