'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icons,
  Loading,
  MultiSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';

import type { AdminBlog } from '@/entities/blog';
import {
  blogFormSchema,
  type BlogFormValues,
} from '@/entities/blog/model/blog-schema';
import { uploadSingleMedia } from '@/entities/media/api/upload-single-media';
import { getPaginatedAdminProjects } from '@/entities/project/api/get-paginated-admin-projects';
import { getPaginatedAdminTags } from '@/entities/tag/api/get-paginated-admin-tags';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

export interface BlogFormProps {
  initialData?: AdminBlog;
  onSubmit: (data: BlogFormValues) => void;
  loading: boolean;
  /** Set by a dialog host so its footer button can submit this form. */
  formId?: string;
}

export function BlogForm({ initialData, onSubmit, loading, formId }: BlogFormProps) {
  const { data: tagsData, isLoading: isTagLoading } = useQuery({
    queryKey: ['tags', 1],
    queryFn: () => getPaginatedAdminTags(1, 100),
  });

  const { data: projectData, isLoading: isProjectLoading } = useQuery({
    queryKey: ['projects', 1],
    queryFn: () => getPaginatedAdminProjects(1, 100),
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

  useEffect(() => {
    if (!initialData) return;

    form.reset({
      slug: initialData.slug,
      publishedDate: initialData.publishedDate
        ? new Date(initialData.publishedDate)
        : null,
      isPublished: initialData.isPublished,
      coverImageId: initialData.coverImageId,
      tagIds: initialData.tags?.map((t) => t.tagId) ?? [],
      projectId: initialData.projectId ?? undefined,
      translations:
        initialData.translations?.length > 0
          ? initialData.translations.map((it) => ({
              ...it,
              content: it.content
                ? typeof it.content === 'string'
                  ? JSON.parse(it.content)
                  : it.content
                : '<p></p>',
            }))
          : [
              {
                language: 'en',
                title: '',
                description: '',
                content: '<p></p>',
              },
            ],
    });
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <TextField
              control={form.control}
              name="slug"
              label="Slug"
              placeholder="my-awesome-blog"
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
                        onValueChange={field.onChange}
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
          <h3 className="text-lg font-semibold">Content Translations</h3>

          <TranslationTabs
            control={form.control}
            name="translations"
            className="w-full"
            newTranslation={() => ({
              language: '',
              title: '',
              description: '',
              content: '',
            })}
            renderFields={(i) => (
              <>
                <TextField
                  control={form.control}
                  name={`translations.${i}.title`}
                  label="Title"
                  placeholder="Post title..."
                />

                <TextField
                  control={form.control}
                  name={`translations.${i}.description`}
                  label="Short Description"
                  placeholder="Brief summary of the post..."
                  multiline
                />

                <FormField
                  control={form.control}
                  name={`translations.${i}.content`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Content</FormLabel>
                      <FormControl>
                        <div className="rounded-md border">
                          <RichTextEditor
                            value={field.value}
                            onChange={field.onChange}
                            uploadImage={uploadSingleMedia}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          />
        </div>

        {/* When hosted in a dialog, the dialog's fixed footer submits via
            the form id instead — no second save button inside the scroll. */}
        {!formId && (
          <div className="flex justify-end gap-4 border-t pt-6">
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
        )}
      </form>
    </Form>
  );
}
