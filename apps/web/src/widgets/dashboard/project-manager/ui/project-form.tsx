'use client';

import { useEffect, useState } from 'react';
import { type DefaultValues, useForm } from 'react-hook-form';
import {
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  fromEditorContent,
  type MultiSelectOption,
  Skeleton,
  toEditorContent,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { ProjectCoauthorFields } from './project-coauthor-fields';

import { useScopedImageUploader } from '@/entities/media/query';
import {
  type AdminProject,
  type ProjectFromValues,
  projectSchema,
} from '@/entities/project/model';
import { useEditorLabels } from '@/shared/hooks/use-editor-labels';
import {
  ContentFade,
  FieldMessage,
  LocalizedMultiSelect,
  TextField,
  TranslationTabs,
} from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { QueryState } from '@/shared/ui/query-state';

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

/** One picker's options and read state. A picker shows its own skeleton, error and empty state. */
type ProjectPickerState = {
  options: MultiSelectOption[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
};

interface ProjectPickerProps {
  picker: ProjectPickerState;
  placeholder: string;
  emptyTitle: string;
  selected: string[];
  onChange: (value: string[]) => void;
}

/**
 * A multi-select that never shows an empty list in place of a failed read: a
 * silent empty picker lets a save drop associations, so a failure shows Retry.
 */
function ProjectPicker({
  picker,
  placeholder,
  emptyTitle,
  selected,
  onChange,
}: ProjectPickerProps) {
  const tShared = useTranslations('dashboard.shared');

  return (
    <QueryState
      isLoading={picker.isLoading}
      isError={picker.isError}
      isEmpty={picker.options.length === 0}
      onRetry={picker.retry}
      skeleton={<Skeleton className="h-11 w-full can-hover:h-10" />}
      errorTitle={tShared('managerListState.errorTitle')}
      errorDescription={tShared('managerListState.errorDescription')}
      retryLabel={tShared('managerListState.retry')}
      emptyTitle={emptyTitle}
    >
      <ContentFade>
        <FormControl>
          {/* 40px is the trigger's desktop height; `can-hover:min-h-9` would shrink it. */}
          <LocalizedMultiSelect
            className="min-h-11 can-hover:min-h-10"
            options={picker.options}
            selected={selected}
            onValueChange={onChange}
            placeholder={placeholder}
          />
        </FormControl>
      </ContentFade>
    </QueryState>
  );
}

interface ProjectFormProps {
  /** Set by the dialog so its footer button can submit this form. */
  formId: string;
  initialData?: AdminProject;
  tags: ProjectPickerState;
  techStacks: ProjectPickerState;
  onSubmit: (values: ProjectFromValues) => void;
  /** Reports unsaved changes, so the dialog asks before closing over them. */
  onDirtyChange: (isDirty: boolean) => void;
}

export function ProjectForm({
  formId,
  initialData,
  tags,
  techStacks,
  onSubmit,
  onDirtyChange,
}: ProjectFormProps) {
  // Images pasted into this editor land under the `project` prefix in storage.
  const uploadImage = useScopedImageUploader('project');
  const t = useTranslations('dashboard.project');
  const tMedia = useTranslations('dashboard.media');
  const editorLabels = useEditorLabels();

  // Seeded once, at mount: the dialog content mounts per open, and the manager
  // keys the dialog per project. A `form.reset` would remount every editor.
  const [defaultValues] = useState(() => toFormValues(initialData));
  const form = useForm<ProjectFromValues>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  });
  const { isDirty } = form.formState;
  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

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
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 can-hover:items-start">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                {/* The label is the tap target; the 16px checkbox alone is not one. */}
                <FormLabel className="flex min-h-11 items-center can-hover:inline">
                  {t('dialog.publishedLabel')}
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="techStackIds"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t('dialog.techStackLabel')}</FormLabel>
                <ProjectPicker
                  picker={techStacks}
                  placeholder={t('dialog.techStackPlaceholder')}
                  emptyTitle={t('dialog.noTechStackOptions')}
                  selected={field.value || []}
                  onChange={field.onChange}
                />
                <FieldMessage message={fieldState.error?.message} />
              </FormItem>
            )}
          />

          {/* Tags Selection */}
          <FormField
            control={form.control}
            name="tagIds"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t('dialog.tagsLabel')}</FormLabel>
                <ProjectPicker
                  picker={tags}
                  placeholder={t('dialog.tagsPlaceholder')}
                  emptyTitle={t('dialog.noTagOptions')}
                  selected={field.value || []}
                  onChange={field.onChange}
                />
                <FieldMessage message={fieldState.error?.message} />
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
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>{t('dialog.descriptionLabel')}</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          compact
                          minHeight={140}
                          placeholder={t('dialog.descriptionPlaceholder')}
                          className="rounded-md"
                          value={toEditorContent(field.value)}
                          // The editor's own normalised copy of the loaded body
                          // is not an edit: without this an untouched form is dirty.
                          onChange={(json, meta) => {
                            if (!meta.initial) {
                              field.onChange(fromEditorContent(json));
                            }
                          }}
                          uploadImage={uploadImage}
                          labels={editorLabels}
                          uploadFailedText={tMedia('toast.uploadError')}
                        />
                      </FormControl>
                      <FieldMessage message={fieldState.error?.message} />
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
