'use client';

import { useForm } from 'react-hook-form';
import { Form } from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { TagFormLoading } from './tag-form-loading';

import type { AdminTag } from '@/entities/tag';
import { type TagFormValues, tagSchema } from '@/entities/tag/model/tag-schema';
import { useResetOnOpen } from '@/shared/hooks/use-reset-on-open';
import {
  EditRecordDialog,
  type EditRecordDialogControls,
  TextField,
  TranslationTabs,
} from '@/shared/ui';

const FORM_ID = 'tag-editor-form';

export interface TagDialogProps extends EditRecordDialogControls {
  /** The full tag, with one row per language. `null` for a new tag. */
  initialData: Nullable<AdminTag>;
  onSubmit: (values: TagFormValues) => void;
}

export function TagDialog({
  initialData,
  onSubmit,
  ...controls
}: TagDialogProps) {
  const t = useTranslations('dashboard.tag');
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      slug: '',
      translations: [{ language: 'en', name: '' }],
    },
  });

  useResetOnOpen(form, controls.open, initialData, (data) => ({
    slug: data.slug,
    translations: data.translations.map((translation) => ({
      id: translation.id,
      language: translation.language,
      name: translation.name,
    })),
  }));

  return (
    <EditRecordDialog
      {...controls}
      entity={t('entity')}
      formId={FORM_ID}
      isDirty={form.formState.isDirty}
      hasRecord={Boolean(initialData)}
      skeleton={<TagFormLoading />}
    >
      <Form {...form}>
        <form
          id={FORM_ID}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <TextField
            control={form.control}
            name="slug"
            label={t('dialog.slugLabel')}
            placeholder={t('dialog.slugPlaceholder')}
          />

          <TranslationTabs
            control={form.control}
            name="translations"
            className="w-full"
            newTranslation={() => ({ language: '', name: '' })}
            renderFields={(i) => (
              <TextField
                control={form.control}
                name={`translations.${i}.name`}
                label={t('dialog.nameLabel')}
                placeholder={t('dialog.namePlaceholder')}
              />
            )}
          />
        </form>
      </Form>
    </EditRecordDialog>
  );
}
