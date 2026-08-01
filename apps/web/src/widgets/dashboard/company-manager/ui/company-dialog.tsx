'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icons,
  MultiSelect,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CompanyRoleItemField } from './company-role-item-field';

import {
  type CompanyFormValues,
  companySchema,
} from '@/entities/company/model/company-schema';
import type { AdminCompany } from '@/entities/company/model/types';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { techStackKeys } from '@/entities/tech-stack/model/query-keys';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { useResetOnOpen } from '@/shared/hooks/use-reset-on-open';
import { TextField, TranslationTabs } from '@/shared/ui';

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Nullable<AdminCompany>;
  onSubmit: (data: CompanyFormValues) => void;
  loading?: boolean;
}

export function CompanyDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: CompanyDialogProps) {
  const t = useTranslations('dashboard.company');
  const { data: techData } = useQuery({
    // Shared with ProjectDialog on purpose — same options data.
    queryKey: techStackKeys.options(),
    queryFn: () => getAllAdminTechStack(),
    enabled: open,
  });

  const techOptions =
    techData?.data?.map((t) => ({ label: t.name, value: t.id })) || [];

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company: '',
      location: '',
      startDate: new Date(),
      endDate: null,
      logoId: null,
      translations: [{ language: 'en', description: '' }],
      techStackIds: [],
      roles: [],
    },
  });

  const {
    fields: roles,
    append: appendRole,
    remove: removeRole,
  } = useFieldArray({
    control: form.control,
    name: 'roles',
  });

  useResetOnOpen(form, open, initialData, (data) => ({
    id: data.id,
    company: data.company,
    location: data.location,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
    logoId: data.logoId ?? null,

    translations:
      data.translations?.length > 0
        ? data.translations.map((t) => ({
            id: t.id,
            language: t.language,
            description: t.description ?? '',
          }))
        : [{ language: 'en', description: '' }],

    techStackIds: data.techStacks?.map((t) => t.techStackId) ?? [],

    roles:
      data.roles?.map((r) => ({
        id: r.id,
        startDate: r.startDate ? new Date(r.startDate) : null,
        endDate: r.endDate ? new Date(r.endDate) : null,
        translations:
          r.translations?.length > 0
            ? r.translations.map((t) => ({
                id: t.id,
                language: t.language,
                title: t.title,
                description: t.description ?? '',
              }))
            : [{ language: 'en', title: '', description: '' }],
        tasks:
          r.tasks?.map((task) => ({
            id: task.id,
            sortOrder: task.sortOrder ?? 0,
            translations:
              task.translations?.length > 0
                ? task.translations.map((t) => ({
                    id: t.id,
                    language: t.language,
                    content: t.content,
                  }))
                : [{ language: 'en', content: '' }],
          })) ?? [],
      })) ?? [],
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? t('dialog.editTitle') : t('dialog.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="logoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialog.logoLabel')}</FormLabel>
                  <FormControl>
                    <MediaSelect
                      value={field.value ?? undefined}
                      onChange={(media) => field.onChange(media?.id ?? null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <TextField
                control={form.control}
                name="company"
                label={t('dialog.companyLabel')}
              />
              <TextField
                control={form.control}
                name="location"
                label={t('dialog.locationLabel')}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.startDateLabel')}</FormLabel>
                    <DatePicker value={field.value} onChange={field.onChange} />
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
                    <DatePicker
                      value={field.value ?? undefined}
                      onChange={(d) => field.onChange(d || null)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="techStackIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialog.techStackLabel')}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={techOptions}
                      selected={field.value || []}
                      onValueChange={field.onChange}
                      placeholder={t('dialog.techStackPlaceholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">
                {t('dialog.translationsTitle')}
              </h3>
              <TranslationTabs
                control={form.control}
                name="translations"
                newTranslation={() => ({ language: '', description: '' })}
                renderFields={(i) => (
                  <TextField
                    control={form.control}
                    name={`translations.${i}.description`}
                    label={t('dialog.descriptionLabel')}
                  />
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {t('dialog.rolesTitle')}
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    appendRole({
                      startDate: null,
                      endDate: null,
                      translations: [
                        { language: 'en', title: '', description: '' },
                      ],
                      tasks: [],
                    })
                  }
                >
                  <Plus className="mr-2 h-3 w-3" />
                  {t('dialog.addRoleButton')}
                </Button>
              </div>

              {roles.map((role, index) => (
                <CompanyRoleItemField
                  key={role.id}
                  index={index}
                  control={form.control}
                  remove={removeRole}
                />
              ))}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}{' '}
                {t('dialog.saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
