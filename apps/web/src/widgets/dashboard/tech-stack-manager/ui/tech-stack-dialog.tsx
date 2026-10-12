'use client';

import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  SubmitButton,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { TechStackFormLoading } from './tech-stack-form-loading';

import type { AdminTechStack } from '@/entities/tech-stack';
import {
  type TechStackFormValues,
  techStackSchema,
} from '@/entities/tech-stack/model/tech-stack-schema';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { useResetOnOpen } from '@/shared/hooks/use-reset-on-open';
import { ContentFade } from '@/shared/ui';
import { QueryState } from '@/shared/ui/query-state';

export function TechStackDialog({
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
  onOpenChange: (v: boolean) => void;
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
  const tShared = useTranslations('dashboard.shared');
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

  // Loading counts as editing before the record arrives: only "new" reaches
  // here with neither `initialData` nor a pending fetch.
  const isEditing = Boolean(initialData) || isLoadingInitialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('dialog.editTitle') : t('dialog.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('dialog.editDescription')
              : t('dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* A dialog has no empty state, so `isEmpty` stays false. */}
        <QueryState
          isLoading={isLoadingInitialData && !hasLoadError}
          isError={hasLoadError}
          isEmpty={false}
          onRetry={() => onRetryLoad?.()}
          skeleton={<TechStackFormLoading />}
          errorTitle={tShared('managerListState.errorTitle')}
          errorDescription={tShared('managerListState.errorDescription')}
          retryLabel={tShared('managerListState.retry')}
          emptyTitle=""
        >
          <ContentFade>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dialog.nameLabel')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* slug */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dialog.slugLabel')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* group */}
                <FormField
                  control={form.control}
                  name="group"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dialog.groupLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* logoId */}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  {/* Deliberately not gated on `formState.isValid`: nothing is
                      touched on open, so Save sat greyed out with no message
                      explaining why. Let `handleSubmit` run and surface the
                      errors, as every other dialog here does. */}
                  <SubmitButton loading={loading}>
                    {t('dialog.saveButton')}
                  </SubmitButton>
                </DialogFooter>
              </form>
            </Form>
          </ContentFade>
        </QueryState>
      </DialogContent>
    </Dialog>
  );
}
