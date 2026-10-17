'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type DefaultValues, useForm } from 'react-hook-form';
import type { FeaturedWorkFormValues } from '@byte-of-me/contracts/featured-work';
import {
  fromEditorContent,
  toEditorContent,
} from '@byte-of-me/rich-text-schema/rich-text-content';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import type { AdminFeaturedWorkDetail } from '@/entities/featured-work/model/types';
import { useScopedImageUploader } from '@/entities/media/query';
import { FieldMessage, TextField, TranslationTabs } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { featuredWorkResolver } from '@/widgets/dashboard/featured-work-manager/lib/featured-work-resolver';
import { toLinkValues } from '@/widgets/dashboard/featured-work-manager/lib/link-values';
import { toTranslationValues } from '@/widgets/dashboard/featured-work-manager/lib/translation-values';
import {
  FeaturedWorkDemo,
  toDemoValues,
} from '@/widgets/dashboard/featured-work-manager/ui/featured-work-demo';
import { FeaturedWorkLinks } from '@/widgets/dashboard/featured-work-manager/ui/featured-work-links';

function toFormValues(
  initialData?: AdminFeaturedWorkDetail
): DefaultValues<FeaturedWorkFormValues> {
  return {
    // Always set, even to []: the update action keeps a list it is not sent, so
    // a form that left this out could never clear one, and one that dropped the
    // loaded list would erase it. The same holds for the demo pair and the links.
    links: toLinkValues(initialData?.links),
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
  /** Reports unsaved changes, so the dialog asks before closing over them. */
  onDirtyChange: (isDirty: boolean) => void;
}

export function FeaturedWorkForm({
  formId,
  initialData,
  onSubmit,
  onUploadingChange,
  onDirtyChange,
}: FeaturedWorkFormProps) {
  // A featured work is a project contribution, so pasted images land under
  // the `project` prefix; `MEDIA_SCOPES` is a closed list and stays untouched
  // here.
  const uploadImage = useScopedImageUploader('project');
  const t = useTranslations('dashboard.featuredWorks');
  const tMedia = useTranslations('dashboard.media');

  // Seeded once, at mount: the dialog is keyed on the edited row.
  const [defaultValues] = useState(() => toFormValues(initialData));
  const form = useForm<FeaturedWorkFormValues>({
    resolver: featuredWorkResolver,
    defaultValues,
  });
  const { isDirty } = form.formState;
  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  // The Save button is disabled meanwhile; this also stops Enter in an input.
  const isUploading = useRef(false);

  // The editor's bar is pinned here, above the tabs: the dialog scrolls, and a bar
  // inside the editor's frame would scroll out of sight. Mirrors the blog editor.
  const [toolbarTarget, setToolbarTarget] = useState<HTMLDivElement | null>(
    null
  );
  const handleUploadingChange = useCallback(
    (value: boolean) => {
      isUploading.current = value;
      onUploadingChange?.(value);
    },
    [onUploadingChange]
  );

  // A repeated language names no tab, so no field can carry its message: it
  // sits above the tabs and is translated here, as `FieldMessage` does.
  const tValidation = useTranslations('dashboard.validation');
  const translationsKey =
    form.formState.errors.translations?.root?.message ??
    form.formState.errors.translations?.message;
  const translationsError = translationsKey?.startsWith('validation.')
    ? tValidation(
        translationsKey.slice('validation.'.length) as Parameters<
          typeof tValidation
        >[0]
      )
    : translationsKey;

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit((data) => {
          if (!isUploading.current) onSubmit(data);
        })}
        className="space-y-6"
      >
        {/* Spans the dialog body's padding, sticks to its top edge so the bar stays in view. */}
        <div
          ref={setToolbarTarget}
          className="sticky -top-4 z-30 -mx-4 -mt-4 min-h-11 bg-background md:-mx-6"
        />
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
                        toolbarTarget={toolbarTarget}
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
                        uploadFailedText={tMedia('toast.uploadError')}
                      />
                    </FormControl>
                    <FieldMessage />
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

        <FeaturedWorkLinks control={form.control} />
      </form>
    </Form>
  );
}
