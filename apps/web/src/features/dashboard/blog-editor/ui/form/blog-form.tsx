'use client';

import { useEffect, useState } from 'react';
import { type DefaultValues, useForm } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@byte-of-me/ui';
import { parseRichTextContent } from '@byte-of-me/ui/lib/rich-text-content';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { BlogMetaFields } from './blog-meta-fields';

import type { AdminBlog } from '@/entities/blog';
import {
  blogFormSchema,
  type BlogFormValues,
} from '@/entities/blog/model/blog-schema';
import { useScopedImageUploader } from '@/entities/media/query';
import { useBlogReferenceOptions } from '@/features/dashboard/blog-editor/lib/use-blog-reference-options';
import { useEditorLabels } from '@/shared/hooks/use-editor-labels';
import { useFormAutosave } from '@/shared/hooks/use-form-autosave';
import {
  type RichTextDoc,
  richTextDocSchema,
} from '@/shared/lib/rich-text-doc-schema';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

/**
 * A stored body as a TipTap document. Stored text that is not a document is
 * kept as one paragraph: an unreadable body is shown, never replaced by an
 * empty one that the next save would write back over it.
 */
function toBodyDoc(stored: string | null | undefined): RichTextDoc {
  const doc = richTextDocSchema.safeParse(parseRichTextContent(stored));
  if (doc.success) return doc.data;

  return {
    type: 'doc',
    content: stored
      ? [{ type: 'paragraph', content: [{ type: 'text', text: stored }] }]
      : [{ type: 'paragraph' }],
  };
}

const emptyTranslation = () => ({
  language: 'en',
  title: '',
  description: '',
  content: toBodyDoc(''),
});

function toFormValues(initialData?: AdminBlog): DefaultValues<BlogFormValues> {
  if (!initialData) {
    return {
      slug: '',
      publishedDate: new Date(),
      isPublished: false,
      tagIds: [],
      projectId: '',
      translations: [emptyTranslation()],
    };
  }

  return {
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
            content: toBodyDoc(it.content),
          }))
        : [emptyTranslation()],
  };
}

export interface BlogFormProps {
  initialData?: AdminBlog;
  /** `options.onSaved` runs once the save has landed, which is when the draft is cleared. */
  onSubmit: (data: BlogFormValues, options: { onSaved: () => void }) => void;
  /** Reports unsaved changes, so the dialog host can ask before it closes. */
  onDirtyChange: (dirty: boolean) => void;
  /** The id the dialog's footer Save button submits. */
  formId: string;
}

export function BlogForm({
  initialData,
  onSubmit,
  onDirtyChange,
  formId,
}: BlogFormProps) {
  // Images pasted into this editor land under the `blog` prefix in storage.
  const uploadImage = useScopedImageUploader('blog');
  const t = useTranslations('dashboard.blog');
  const tMedia = useTranslations('dashboard.media');
  const editorLabels = useEditorLabels();
  const { tagOptions, projects, tagsState, projectsState } =
    useBlogReferenceOptions();

  // Seeded once, at mount: the host mounts this form on a loaded post and keys
  // the dialog per id. A later `form.reset` remounts every editor (new field-array
  // ids), and re-seeding on a refetch's fresh `initialData` wipes what was typed.
  const [defaultValues] = useState(() => toFormValues(initialData));
  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues,
  });

  const { isDirty } = form.formState;
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const autosave = useFormAutosave(
    form,
    `blog-draft:${initialData?.id ?? 'new'}`
  );

  // The editor's bar is pinned here, above the fields: its card sits ~950px down
  // a phone form, so the card's own bar never opens on screen. `min-h-11` reserves
  // 44px until the editor mounts; the bar is 41px on desktop and 49px on touch.
  const [toolbarTarget, setToolbarTarget] = useState<HTMLDivElement | null>(
    null
  );

  // No `onInvalid` handler revealing the erroring language tab: TranslationTabs
  // subscribes to its own errors and reveals itself, at every nesting level.
  const handleSubmit = form.handleSubmit((values) =>
    onSubmit(values, { onSaved: autosave.clear })
  );

  return (
    <Form {...form}>
      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        {/* Spans the body's padding and sticks to its outer top edge, so no field shows above the bar. */}
        <div
          ref={setToolbarTarget}
          className="sticky -top-4 z-30 -mx-4 -mt-4 min-h-11 bg-background md:-mx-6"
        />

        {autosave.restorable && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <span>
              {t('form.draftFound', {
                time: autosave.restorable.toLocaleTimeString(),
              })}
            </span>
            <span className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="min-h-11 can-hover:min-h-9"
                onClick={autosave.restore}
              >
                {t('form.restore')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11 can-hover:min-h-9"
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
          projectsState={projectsState}
          tagOptions={tagOptions}
          tagsState={tagsState}
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
            newTranslation={() => ({ ...emptyTranslation(), language: '' })}
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
                      {/* FormControl sits INSIDE the frame, not around it: its
                          Slot injects the id the label points at, and a label
                          has to resolve to something focusable — this div is
                          not. The frame itself is unchanged. */}
                      <div className="rounded-md border">
                        <FormControl>
                          <RichTextEditor
                            toolbarTarget={toolbarTarget}
                            value={field.value}
                            // The editor's own normalised copy of the loaded body
                            // is not an edit: without this an untouched form is dirty.
                            onChange={(json, meta) => {
                              if (!meta.initial) field.onChange(json);
                            }}
                            uploadImage={uploadImage}
                            labels={editorLabels}
                            uploadFailedText={tMedia('toast.uploadError')}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
