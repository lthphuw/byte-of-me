'use client';

import { useState } from 'react';
import { type DefaultValues, useForm } from 'react-hook-form';
import {
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  fromEditorContent,
  MultiSelect,
  type Option,
  toEditorContent,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { ProjectCoauthorFields } from './project-coauthor-fields';

import { createScopedImageUploader } from '@/entities/media';
import {
  type AdminProject,
  type ProjectFromValues,
  projectSchema,
} from '@/entities/project/model';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

/** Images pasted into this editor land under the `project` prefix in storage. */
const uploadImage = createScopedImageUploader('project');

function toFormValues(
  initialData?: AdminProject
): DefaultValues<ProjectFromValues> {
  if (!initialData) {
    return {
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
    };
  }

  return {
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
  };
}

interface ProjectFormProps {
  /** Set by the dialog so its footer button can submit this form. */
  formId: string;
  initialData?: AdminProject;
  tagOptions: Option[];
  techOptions: Option[];
  onSubmit: (values: ProjectFromValues) => void;
}

export function ProjectForm({
  formId,
  initialData,
  tagOptions,
  techOptions,
  onSubmit,
}: ProjectFormProps) {
  const t = useTranslations('dashboard.project');

  // Seeded once, at mount: the dialog mounts this per open and keys itself per
  // project. A later `form.reset` would remount every editor (new field-array ids).
  const [defaultValues] = useState(() => toFormValues(initialData));
  const form = useForm<ProjectFromValues>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  });

  // No `onInvalid` handler revealing the erroring language tab: TranslationTabs
  // subscribes to its own errors and reveals itself, at every nesting level.
  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <Form {...form}>
      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="slug"
            label={t('dialog.slugLabel')}
            placeholder={t('dialog.slugPlaceholder')}
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              control={form.control}
              name="startDate"
              label={t('dialog.startDateLabel')}
              type="date"
            />
            <TextField
              control={form.control}
              name="endDate"
              label={t('dialog.endDateLabel')}
              type="date"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="githubLink"
            label={t('dialog.githubLinkLabel')}
            placeholder={t('dialog.githubLinkPlaceholder')}
          />
          <TextField
            control={form.control}
            name="liveLink"
            label={t('dialog.liveLinkLabel')}
            placeholder={t('dialog.liveLinkPlaceholder')}
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
                <FormLabel>{t('dialog.publishedLabel')}</FormLabel>
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
                <FormLabel>{t('dialog.techStackLabel')}</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={techOptions}
                    selected={field.value || []}
                    onValueChange={field.onChange}
                    placeholder={t('dialog.techStackPlaceholder')}
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
                <FormLabel>{t('dialog.tagsLabel')}</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={tagOptions}
                    selected={field.value || []}
                    onValueChange={field.onChange}
                    placeholder={t('dialog.tagsPlaceholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <ProjectCoauthorFields control={form.control} />

        <div className="space-y-4 border-t pt-4">
          <span className="text-sm font-medium">
            {t('dialog.translationsLabel')}
          </span>

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
                  label={t('dialog.titleLabel')}
                />
                <FormField
                  control={form.control}
                  name={`translations.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dialog.descriptionLabel')}</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          compact
                          minHeight={140}
                          placeholder={t('dialog.descriptionPlaceholder')}
                          className="rounded-md"
                          value={toEditorContent(field.value)}
                          onChange={(json) =>
                            field.onChange(fromEditorContent(json))
                          }
                          uploadImage={uploadImage}
                        />
                      </FormControl>
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
