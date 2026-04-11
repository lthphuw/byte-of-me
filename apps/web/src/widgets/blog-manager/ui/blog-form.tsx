'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { AdminBlog } from '@/entities/blog';
import { BlogFormValues, blogFormSchema } from '@/entities/blog/schemas/blog';
import { getPaginatedAdminProject } from '@/entities/project/api/get-paginated-admin-project';
import { getPaginatedAdminTags } from '@/entities/tag/api/get-paginated-admin-tags';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { Icons } from '@/shared/ui/icons';
import { Input } from '@/shared/ui/input';
import { MultiSelect } from '@/shared/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';
import { RichTextEditor } from '@/shared/ui/tiptap/rich-text-editor';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Languages, Trash } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';

import Loading from '../../../shared/ui/loading';

export interface BlogFormProps {
  initialData?: AdminBlog;
  onSubmit: (data: BlogFormValues) => void;
  loading: boolean;
}

export function BlogForm({ initialData, onSubmit, loading }: BlogFormProps) {
  const { data: tagsData, isLoading: isTagLoading } = useQuery({
    queryKey: ['tags', 1],
    queryFn: () => getPaginatedAdminTags(1, 100),
  });

  const { data: projectData, isLoading: isProjectLoading } = useQuery({
    queryKey: ['projects', 1],
    queryFn: () => getPaginatedAdminProject(1, 100),
  });

  const tags = tagsData?.data?.data || [];
  const projects = projectData?.data?.data || [];

  const tagOptions = React.useMemo(
    () =>
      tags?.map((tag) => ({
        label: tag.translations?.[0]?.name || 'Unknown',
        value: tag.id,
      })) || [],
    [tags]
  );

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      slug: '',
      publishedDate: new Date(),
      isPublished: false,
      tagIds: [],
      projectId: '',
      translations: [
        {
          language: 'en',
          title: '',
          description: '',
          content: '<p></p>',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'translations',
  });

  const [tab, setTab] = useState<string>();

  useEffect(() => {
    if (!initialData) return;

    form.reset({
      slug: initialData.slug,
      publishedDate: initialData.publishedDate
        ? new Date(initialData.publishedDate)
        : null,
      isPublished: initialData.isPublished,
      coverImageId: initialData.coverImageId,
      tagIds: initialData.tags?.map((t: any) => t.tagId) ?? [],
      projectId: initialData.projectId ?? undefined,
      translations:
        initialData.translations?.length > 0
          ? initialData.translations.map((it) => ({
              ...it,
              content: it.content ? (
                typeof it.content === 'string' ? (
                  JSON.parse(it.content)
                ) : (
                  it.content
                )
              ) : (
                <p></p>
              ),
            }))
          : [
              {
                language: 'en',
                title: '',
                description: '',
                content: <p></p>,
              },
            ],
    });
  }, [initialData, form]);

  useEffect(() => {
    if (fields.length > 0 && !tab) setTab(fields[0].id);
  }, [fields, tab]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="my-awesome-blog" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) =>
                isProjectLoading ? (
                  <Loading />
                ) : (
                  <FormItem>
                    <FormLabel>Related Project</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'none'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a projectSchema (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>

                          {projects?.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.translations?.[0]?.title || project.slug}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }
            />

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
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="coverImageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image</FormLabel>
                  <FormControl>
                    <MediaSelect
                      value={field.value ?? undefined}
                      onChange={(media) => field.onChange(media?.id)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tagIds"
              render={({ field }) =>
                isTagLoading ? (
                  <Loading />
                ) : (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={tagOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Select tags..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }
            />
          </div>
        </div>

        {/* Translations Section */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Content Translations</h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                append({
                  language: 'new',
                  title: '',
                  description: '',
                  content: '',
                })
              }
            >
              Add Language <Languages className="ml-2 w-4 h-4" />
            </Button>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="mb-4">
              {fields.map((f, i) => {
                const lang = form.watch(`translations.${i}.language`);
                return (
                  <TabsTrigger key={f.id} value={f.id}>
                    {lang?.toUpperCase() || 'NEW'}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {fields.map((f, i) => (
              <TabsContent
                key={f.id}
                value={f.id}
                className="space-y-4 animate-in fade-in duration-300"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name={`translations.${i}.language`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lang Code (e.g. en, vi)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-3">
                    <FormField
                      control={form.control}
                      name={`translations.${i}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Post title..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name={`translations.${i}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief summary of the post..."
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`translations.${i}.content`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Content</FormLabel>
                      <FormControl>
                        <div className="border rounded-md">
                          <RichTextEditor
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  className="w-full"
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => remove(i)}
                >
                  <Trash className="mr-2 w-4 h-4" /> Remove Translation
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="submit"
            size="lg"
            className="min-w-[120px]"
            disabled={loading}
          >
            {loading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Save Post'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
