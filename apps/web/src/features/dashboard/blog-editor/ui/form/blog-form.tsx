'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icons,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { BlogMetaFields } from './blog-meta-fields';

import type { AdminBlog } from '@/entities/blog';
import {
  blogFormSchema,
  type BlogFormValues,
} from '@/entities/blog/model/blog-schema';
import { uploadSingleMedia } from '@/entities/media/api/upload-single-media';
import { useBlogReferenceOptions } from '@/features/dashboard/blog-editor/lib/use-blog-reference-options';
import { useFormAutosave } from '@/shared/hooks/use-form-autosave';
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
  const t = useTranslations('dashboard.blog');
  const { tagOptions, projects, isTagLoading, isProjectLoading } =
    useBlogReferenceOptions();

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

  // Seed the form once per post, not once per `initialData` identity. The
  // editor renders on `blogKeys.detail(id)`, which TanStack Query refetches on
  // window focus and on reconnect; every one of those resolves to a fresh
  // object, and resetting on identity would silently throw away everything the
  // author has typed since. Only a different post id means "a different record
  // is being edited", and that also remounts this component (the dialog is
  // keyed on the id), so the ref starts null exactly when a reset is wanted.
  const seededBlogId = useRef<string | null>(null);

  useEffect(() => {
    if (!initialData || seededBlogId.current === initialData.id) return;
    seededBlogId.current = initialData.id;

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

  const autosave = useFormAutosave(
    form,
    `blog-draft:${initialData?.id ?? 'new'}`
  );

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit((values) => {
          autosave.clear();
          onSubmit(values);
        })}
        className="space-y-6"
      >
        {autosave.restorable && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <span>
              {t('form.draftFound', {
                time: autosave.restorable.toLocaleTimeString(),
              })}
            </span>
            <span className="flex gap-2">
              <Button type="button" size="sm" onClick={autosave.restore}>
                {t('form.restore')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={autosave.discard}
              >
                {t('form.discard')}
              </Button>
            </span>
          </div>
        )}
        <BlogMetaFields
          control={form.control}
          projects={projects}
          tagOptions={tagOptions}
          isProjectLoading={isProjectLoading}
          isTagLoading={isTagLoading}
        />

        {/* Translations Section */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-semibold">
            {t('form.contentTranslationsTitle')}
          </h3>

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
                  label={t('form.titleLabel')}
                  placeholder={t('form.titlePlaceholder')}
                />

                <TextField
                  control={form.control}
                  name={`translations.${i}.description`}
                  label={t('form.descriptionLabel')}
                  placeholder={t('form.descriptionPlaceholder')}
                  multiline
                />

                <FormField
                  control={form.control}
                  name={`translations.${i}.content`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('form.bodyLabel')}</FormLabel>
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
                t('form.savePost')
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
