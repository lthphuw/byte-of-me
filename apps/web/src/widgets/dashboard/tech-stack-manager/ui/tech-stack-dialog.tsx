'use client';

import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { TechStackFormLoading } from './tech-stack-form-loading';

import {
  type AdminTechStack,
  type TechStackFormValues,
  techStackSchema,
} from '@/entities/tech-stack/model';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { useResetOnOpen } from '@/shared/hooks/use-reset-on-open';
import { EditRecordGate } from '@/shared/ui/edit-record-gate';
import { FieldMessage } from '@/shared/ui/form/field-message';
import { RecordDialog } from '@/shared/ui/record-dialog';

const FORM_ID = 'tech-stack-form';

export function TechStackDialog({
  open,
  onOpenChange,
  isEditing,
  initialData,
  isLoadingInitialData = false,
  hasLoadError = false,
  onRetryLoad,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Set from the list row, so the title does not flip while the record loads. */
  isEditing: boolean;
  initialData: AdminTechStack | null;
  /** The full record is loading or its fetch failed. The form stays unmounted until it arrives. */
  isLoadingInitialData?: boolean;
  /** The full-record fetch failed; the dialog offers `onRetryLoad` instead. */
  hasLoadError?: boolean;
  onRetryLoad?: () => void;
  onSubmit: (values: TechStackFormValues) => void;
  loading: boolean;
}) {
  const t = useTranslations('dashboard.techStack');
  const tCrud = useTranslations('dashboard.shared.crud');
  // The form lives here, not in the gated body, so its dirty state is known
  // to the dialog's close path before the record has arrived.
  const form = useForm<TechStackFormValues>({
    resolver: zodResolver(techStackSchema),
    defaultValues: {
      name: '',
      slug: '',
      group: '',
      logoId: null,
    },
  });

  useResetOnOpen(form, open, initialData, (data) => ({
    name: data.name,
    slug: data.slug,
    group: data.group ?? '',
    logoId: data.logoId ?? null,
  }));

  return (
    <RecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEditing
          ? tCrud('editTitle', { entity: t('entity') })
          : tCrud('newTitle', { entity: t('entity') })
      }
      description={
        isEditing ? t('dialog.editDescription') : t('dialog.createDescription')
      }
      size="md"
      formId={FORM_ID}
      isPending={loading}
      isDirty={form.formState.isDirty}
      // Save waits for the full record, as the gate below holds the form back.
      submitDisabled={
        isEditing && (isLoadingInitialData || hasLoadError || !initialData)
      }
    >
      <EditRecordGate
        isNotReady={isLoadingInitialData}
        hasError={hasLoadError}
        onRetry={() => onRetryLoad?.()}
        skeleton={<TechStackFormLoading />}
      >
        <Form {...form}>
          <form
            id={FORM_ID}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FieldMessage message={fieldState.error?.message} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.slugLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FieldMessage message={fieldState.error?.message} />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="group"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('dialog.groupLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FieldMessage message={fieldState.error?.message} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logoId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('dialog.logoLabel')}</FormLabel>
                  <FormControl>
                    <MediaSelect
                      value={field.value ?? undefined}
                      onChange={(m) => field.onChange(m?.id ?? null)}
                    />
                  </FormControl>
                  <FieldMessage message={fieldState.error?.message} />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </EditRecordGate>
    </RecordDialog>
  );
}
