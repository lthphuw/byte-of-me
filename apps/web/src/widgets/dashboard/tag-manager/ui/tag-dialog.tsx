'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import {
  Button,
  DeleteButton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Form,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TagFormLoading } from './tag-form-loading';

import type { AdminTag } from '@/entities/tag';
import { type TagFormValues, tagSchema } from '@/entities/tag/model/tag-schema';
import { useResetOnOpen } from '@/shared/hooks/use-reset-on-open';
import { ContentFade, TextField } from '@/shared/ui';
import { QueryState } from '@/shared/ui/query-state';

export function TagDialog({
  open,
  onOpenChange,
  initialData,
  isLoadingInitialData = false,
  hasLoadError = false,
  onRetryLoad,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Nullable<AdminTag>;
  /** The full record is loading or its fetch failed. The form stays unmounted until it arrives. */
  isLoadingInitialData?: boolean;
  /** The full-record fetch failed; the dialog offers `onRetryLoad` instead. */
  hasLoadError?: boolean;
  onRetryLoad?: () => void;
  onSubmit: (values: TagFormValues) => void;
  loading: boolean;
}) {
  const t = useTranslations('dashboard.tag');
  const tShared = useTranslations('dashboard.shared');
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      slug: '',
      translations: [{ language: 'en', name: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'translations',
  });

  useResetOnOpen(form, open, initialData, (data) => ({
    slug: data.slug,
    translations: data.translations.map((t) => ({
      id: t.id,
      language: t.language,
      name: t.name,
    })),
  }));

  const handleSubmit = (values: TagFormValues) => {
    onSubmit(values);
  };

  // Loading counts as editing before the record arrives: only "new" reaches
  // here with neither `initialData` nor a pending fetch.
  const isEditing = Boolean(initialData) || isLoadingInitialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('dialog.editTitle') : t('dialog.createTitle')}
          </DialogTitle>
        </DialogHeader>

        {/* A dialog has no empty state, so `isEmpty` stays false. */}
        <QueryState
          isLoading={isLoadingInitialData && !hasLoadError}
          isError={hasLoadError}
          isEmpty={false}
          onRetry={() => onRetryLoad?.()}
          skeleton={<TagFormLoading />}
          errorTitle={tShared('managerListState.errorTitle')}
          errorDescription={tShared('managerListState.errorDescription')}
          retryLabel={tShared('managerListState.retry')}
          emptyTitle=""
        >
          <ContentFade>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-5"
            >
              {/* Slug */}
              <TextField
                control={form.control}
                name="slug"
                label={t('dialog.slugLabel')}
                placeholder={t('dialog.slugPlaceholder')}
              />

              {/* Translations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {t('dialog.translationsLabel')}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => append({ language: '', name: '' })}
                  >
                    {t('dialog.addButton')}
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 rounded-lg border p-2"
                  >
                    <TextField
                      control={form.control}
                      name={`translations.${index}.language`}
                      label={t('dialog.languageLabel')}
                      placeholder={t('dialog.languagePlaceholder')}
                      className="w-20"
                    />

                    <TextField
                      control={form.control}
                      name={`translations.${index}.name`}
                      label={t('dialog.nameLabel')}
                      placeholder={t('dialog.namePlaceholder')}
                      className="flex-1"
                    />

                    <DeleteButton
                      label={tShared('translationTabs.removeLanguage')}
                      onClick={() => remove(index)}
                    />
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  {t('dialog.cancelButton')}
                </Button>

                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t('dialog.saveButton')}
                </Button>
              </div>
            </form>
          </Form>
          </ContentFade>
        </QueryState>
      </DialogContent>
    </Dialog>
  );
}
