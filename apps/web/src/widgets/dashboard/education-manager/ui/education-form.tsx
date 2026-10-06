'use client';

import { useState } from 'react';
import { type DefaultValues, useForm } from 'react-hook-form';
import {
  DatePicker,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  fromEditorContent,
  toEditorContent,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import type { AdminEducation } from '@/entities/education';
import {
  type EducationFormValues,
  educationSchema,
} from '@/entities/education/model/education-schema';
import { createScopedImageUploader } from '@/entities/media';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

/** Images pasted into this editor land under the `education` prefix in storage. */
const uploadImage = createScopedImageUploader('education');

/**
 * Reorder pulls framer-motion's heavy projection half and only renders inside
 * DialogContent, which Radix leaves unmounted while closed; lazy-loading keeps
 * drag-and-drop out of the `/dashboard/educations` first paint.
 */
const EducationAchievementsField = dynamic(
  () =>
    import(
      '@/widgets/dashboard/education-manager/ui/education-achievements-field'
    ).then((mod) => mod.EducationAchievementsField),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] w-full animate-pulse rounded-md border bg-muted/30" />
    ),
  }
);

function toFormValues(
  initialData?: AdminEducation
): DefaultValues<EducationFormValues> {
  if (!initialData) {
    return {
      sortOrder: 0,
      startDate: new Date(),
      endDate: null,
      logoId: null,
      translations: [{ language: 'en', title: '', description: '' }],
      achievements: [],
    };
  }

  return {
    id: initialData.id,
    sortOrder: initialData.sortOrder ?? 0,
    startDate: initialData.startDate
      ? new Date(initialData.startDate)
      : new Date(),
    endDate: initialData.endDate ? new Date(initialData.endDate) : null,
    logoId: initialData.logoId ?? null,

    translations:
      initialData.translations?.length > 0
        ? initialData.translations
        : [{ language: 'en', title: '', description: '' }],

    achievements:
      initialData.achievements?.map((a) => ({
        id: a.id,
        sortOrder: a.sortOrder ?? 0,
        translations:
          a.translations?.length > 0
            ? a.translations
            : [{ language: 'en', title: '', content: '' }],
        imageIds: a.images?.map((it) => it.mediaId) ?? [],
      })) ?? [],
  };
}

interface EducationFormProps {
  /** Set by the dialog so its footer button can submit this form. */
  formId: string;
  initialData?: AdminEducation;
  onSubmit: (data: EducationFormValues) => void;
}

export function EducationForm({
  formId,
  initialData,
  onSubmit,
}: EducationFormProps) {
  const t = useTranslations('dashboard.education');

  // Seeded once, at mount: the dialog mounts this on a loaded entry. A later
  // `form.reset` would remount every editor (new field-array ids) and wipe edits.
  const [defaultValues] = useState(() => toFormValues(initialData));
  const form = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    defaultValues,
  });

  // Achievement order is whatever the list shows, so `sortOrder` is stamped
  // from the position at submit time rather than tracked as an editable field.
  const handleValid = (values: EducationFormValues) =>
    onSubmit({
      ...values,
      achievements: values.achievements.map((achievement, index) => ({
        ...achievement,
        sortOrder: index,
      })),
    });

  // No `onInvalid` handler revealing the erroring language tab: TranslationTabs
  // subscribes to its own errors and reveals itself, at every nesting level.
  const handleSubmit = form.handleSubmit(handleValid);

  return (
    <Form {...form}>
      <form id={formId} onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="logoId"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>{t('dialog.logoLabel')}</FormLabel>
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
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dialog.startDateLabel')}</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dialog.endDateLabel')}</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={(d) => field.onChange(d || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <section className="space-y-4 border-t pt-6">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">
              {t('dialog.translationsTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('dialog.translationsDescription')}
            </p>
          </div>

          <TranslationTabs
            control={form.control}
            name="translations"
            newTranslation={() => ({
              language: '',
              title: '',
              description: '',
            })}
            renderFields={(i) => (
              <>
                <TextField
                  control={form.control}
                  name={`translations.${i}.title`}
                  label={t('dialog.schoolLabel')}
                />

                <FormField
                  control={form.control}
                  name={`translations.${i}.description`}
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
        </section>

        <EducationAchievementsField control={form.control} />
      </form>
    </Form>
  );
}
