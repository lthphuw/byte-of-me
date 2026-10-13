'use client';

import { useForm } from 'react-hook-form';
import { Form } from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { TagFormLoading } from './tag-form-loading';

import type { AdminTag } from '@/entities/tag';
import { type TagFormValues, tagSchema } from '@/entities/tag/model/tag-schema';
import { useResetOnOpen } from '@/shared/hooks/use-reset-on-open';
import { RecordDialog, TextField, TranslationTabs } from '@/shared/ui';
import { EditRecordGate } from '@/shared/ui/edit-record-gate';

const FORM_ID = 'tag-editor-form';

export interface TagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The full tag, with one row per language. `null` for a new tag. */
  initialData: Nullable<AdminTag>;
  /** The full tag is loading or was never requested, so the form must not mount yet. */
  isNotReady: boolean;
  hasError: boolean;
  onRetry: () => void;
  isPending: boolean;
  onSubmit: (values: TagFormValues) => void;
}

export function TagDialog({
  open,
  onOpenChange,
  initialData,
  isNotReady,
  hasError,
  onRetry,
  isPending,
  onSubmit,
}: TagDialogProps) {
  const t = useTranslations('dashboard.tag');
  const crud = useTranslations('dashboard.shared.crud');
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      slug: '',
      translations: [{ language: 'en', name: '' }],
    },
  });

  useResetOnOpen(form, open, initialData, (data) => ({
    slug: data.slug,
    translations: data.translations.map((translation) => ({
      id: translation.id,
      language: translation.language,
      name: translation.name,
    })),
  }));

  // Loading counts as editing before the record arrives: only "new" has neither.
  const isEditing = Boolean(initialData) || isNotReady;
  const entity = t('entity');

  return (
    <RecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEditing ? crud('editTitle', { entity }) : crud('newTitle', { entity })
      }
      formId={FORM_ID}
      isPending={isPending}
      isDirty={form.formState.isDirty}
    >
      <EditRecordGate
        isNotReady={isNotReady}
        hasError={hasError}
        onRetry={onRetry}
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
      </EditRecordGate>
    </RecordDialog>
  );
}
