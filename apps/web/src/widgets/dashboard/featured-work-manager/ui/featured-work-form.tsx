'use client';

import { useState } from 'react';
import { type DefaultValues, useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Switch,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import type { AdminFeaturedWork } from '@/entities/featured-work';
import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';
import { TextField } from '@/shared/ui';
import { featuredWorkResolver } from '@/widgets/dashboard/featured-work-manager/lib/featured-work-resolver';
import {
  FEATURED_WORK_LANGUAGES,
  toTranslationValues,
} from '@/widgets/dashboard/featured-work-manager/lib/translation-values';

function toFormValues(
  initialData?: AdminFeaturedWork
): DefaultValues<FeaturedWorkFormValues> {
  return {
    isPublished: initialData?.isPublished ?? false,
    url: initialData?.url ?? '',
    translations: toTranslationValues(initialData?.translations),
  };
}

interface FeaturedWorkFormProps {
  /** Set by the dialog so its footer button can submit this form. */
  formId: string;
  initialData?: AdminFeaturedWork;
  onSubmit: (data: FeaturedWorkFormValues) => void;
}

export function FeaturedWorkForm({
  formId,
  initialData,
  onSubmit,
}: FeaturedWorkFormProps) {
  const t = useTranslations('dashboard.featuredWorks');

  // Seeded once, at mount: the dialog is keyed on the edited row.
  const [defaultValues] = useState(() => toFormValues(initialData));
  const form = useForm<FeaturedWorkFormValues>({
    resolver: featuredWorkResolver,
    defaultValues,
  });

  // The server answers a repeated language with one generic message, so this
  // array-level error is only ever shown here.
  const translationsError =
    form.formState.errors.translations?.root?.message ??
    form.formState.errors.translations?.message;

  const languageLabels = {
    en: t('languageEn'),
    vi: t('languageVi'),
  } as const;

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {FEATURED_WORK_LANGUAGES.map((language, i) => (
          <fieldset key={language} className="min-w-0 space-y-4">
            <legend className="mb-3 text-sm font-medium">
              {languageLabels[language]}
            </legend>
            <TextField
              control={form.control}
              name={`translations.${i}.title`}
              label={t('titleLabel')}
            />
            <TextField
              control={form.control}
              name={`translations.${i}.description`}
              label={t('descriptionLabel')}
              multiline
            />
          </fieldset>
        ))}

        {translationsError && (
          <p role="alert" className="text-[0.8rem] font-medium text-destructive-text">
            {translationsError}
          </p>
        )}

        <TextField
          control={form.control}
          name="url"
          label={t('urlLabel')}
          placeholder={t('urlPlaceholder')}
        />

        <FormField
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 space-y-0 rounded-md border p-3">
              <FormLabel>{t('publishedLabel')}</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
