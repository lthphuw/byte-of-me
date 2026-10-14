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
import { EditRecordDialog, type EditRecordDialogControls } from '@/shared/ui';
import { FieldMessage } from '@/shared/ui/form/field-message';

const FORM_ID = 'tech-stack-form';

interface TechStackDialogProps extends EditRecordDialogControls {
  initialData: Nullable<AdminTechStack>;
  onSubmit: (values: TechStackFormValues) => void;
}

export function TechStackDialog({
  initialData,
  onSubmit,
  ...controls
}: TechStackDialogProps) {
  const t = useTranslations('dashboard.techStack');
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

  useResetOnOpen(form, controls.open, initialData, (data) => ({
    name: data.name,
    slug: data.slug,
    group: data.group ?? '',
    logoId: data.logoId ?? null,
  }));

  return (
    <EditRecordDialog
      {...controls}
      entity={t('entity')}
      editDescription={t('dialog.editDescription')}
      createDescription={t('dialog.createDescription')}
      formId={FORM_ID}
      isDirty={form.formState.isDirty}
      hasRecord={Boolean(initialData)}
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialog.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FieldMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialog.slugLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FieldMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="group"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dialog.groupLabel')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FieldMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dialog.logoLabel')}</FormLabel>
                <FormControl>
                  <MediaSelect
                    value={field.value ?? undefined}
                    onChange={(m) => field.onChange(m?.id ?? null)}
                  />
                </FormControl>
                <FieldMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EditRecordDialog>
  );
}
