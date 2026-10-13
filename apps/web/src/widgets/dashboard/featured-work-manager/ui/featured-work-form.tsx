'use client';

import { useCallback, useRef, useState } from 'react';
import { type DefaultValues, useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  fromEditorContent,
  toEditorContent,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import type { AdminFeaturedWorkDetail } from '@/entities/featured-work';
import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';
import { useScopedImageUploader } from '@/entities/media/query';
import { useEditorLabels } from '@/shared/hooks/use-editor-labels';
import { TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { featuredWorkResolver } from '@/widgets/dashboard/featured-work-manager/lib/featured-work-resolver';
import { toTranslationValues } from '@/widgets/dashboard/featured-work-manager/lib/translation-values';
import {
  FeaturedWorkDemo,
  toDemoValues,
} from '@/widgets/dashboard/featured-work-manager/ui/featured-work-demo';

function toFormValues(
  initialData?: AdminFeaturedWorkDetail
): DefaultValues<FeaturedWorkFormValues> {
  return {
    url: initialData?.url ?? '',
    // Always set, even to []: the update action keeps a pair it is not sent, so
    // a form that left this out could never clear one, and one that dropped the
    // loaded pair would erase it.
    media: toDemoValues(initialData?.media),
    translations: toTranslationValues(initialData?.translations),
  };
}

interface FeaturedWorkFormProps {
  /** Set by the dialog so its footer button can submit this form. */
  formId: string;
  /** The full row, with each language's body. The list row has no bodies. */
  initialData?: AdminFeaturedWorkDetail;
  onSubmit: (data: FeaturedWorkFormValues) => void;
  /** Reports a demo clip in flight; a save then would leave it out. */
  onUploadingChange?: (isUploading: boolean) => void;
}

export function FeaturedWorkForm({
  formId,
  initialData,
  onSubmit,
  onUploadingChange,
}: FeaturedWorkFormProps) {
  // A featured work is a project contribution, so pasted images land under
  // the `project` prefix; `MEDIA_SCOPES` is a closed list and stays untouched
  // here.
  const uploadImage = useScopedImageUploader('project');
  const t = useTranslations('dashboard.featuredWorks');
  const tMedia = useTranslations('dashboard.media');
  const editorLabels = useEditorLabels();

  // Seeded once, at mount: the dialog is keyed on the edited row.
  const [defaultValues] = useState(() => toFormValues(initialData));
  const form = useForm<FeaturedWorkFormValues>({
    resolver: featuredWorkResolver,
    defaultValues,
  });

  // The Save button is disabled meanwhile; this also stops Enter in an input.
  const isUploading = useRef(false);
  const handleUploadingChange = useCallback(
    (value: boolean) => {
      isUploading.current = value;
      onUploadingChange?.(value);
    },
    [onUploadingChange]
  );

  // The server answers a repeated language with one generic message. It names
  // no tab, so it sits above the tabs where it shows on whichever is open.
  const translationsError =
    form.formState.errors.translations?.root?.message ??
    form.formState.errors.translations?.message;

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit((data) => {
          if (!isUploading.current) onSubmit(data);
        })}
        className="space-y-6"
      >
        {translationsError && (
          <p
            role="alert"
            className="text-[0.8rem] font-medium text-destructive-text"
          >
            {translationsError}
          </p>
        )}

        {/* One tab per language, English first. A hidden tab's editor unmounts,
            but its body stays in form state: seeded back on return, submitted. */}
        <TranslationTabs
          control={form.control}
          name="translations"
          newTranslation={() => ({
            language: '',
            title: '',
            details: '',
          })}
          renderFields={(index) => (
            <>
              <TextField
                control={form.control}
                name={`translations.${index}.title`}
                label={t('titleLabel')}
              />
              <FormField
                control={form.control}
                name={`translations.${index}.details`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('detailsLabel')}</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        compact
                        minHeight={140}
                        className="rounded-md"
                        value={toEditorContent(field.value)}
                        // Ignores the editor's own normalised copy of the loaded
                        // body (not an edit), so an untouched save writes the
                        // stored string back unchanged.
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        />

        <FormField
          control={form.control}
          name="media"
          render={({ field }) => (
            <FeaturedWorkDemo
              field={field}
              initialMedia={initialData?.media}
              onUploadingChange={handleUploadingChange}
            />
          )}
        />

        <TextField
          control={form.control}
          name="url"
          label={t('urlLabel')}
          placeholder={t('urlPlaceholder')}
        />
      </form>
    </Form>
  );
}
