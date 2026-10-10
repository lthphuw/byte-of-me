'use client';

import { useState } from 'react';
import { type DefaultValues, useFieldArray, useForm } from 'react-hook-form';
import {
  Button,
  DatePicker,
  DialogFooter,
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
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CompanyRoleItemField } from './company-role-item-field';

import {
  type CompanyFormValues,
  companySchema,
} from '@/entities/company/model/company-schema';
import type { AdminCompany } from '@/entities/company/model/types';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import type { TechStackOptionsResult } from '@/features/dashboard/tech-stack-management';
import { TextField, TranslationTabs } from '@/shared/ui';

function toFormValues(
  initialData?: AdminCompany
): DefaultValues<CompanyFormValues> {
  if (!initialData) {
    return {
      company: '',
      location: '',
      startDate: new Date(),
      endDate: null,
      logoId: null,
      translations: [{ language: 'en', description: '' }],
      techStackIds: [],
      roles: [],
    };
  }

  return {
    id: initialData.id,
    company: initialData.company,
    location: initialData.location,
    startDate: new Date(initialData.startDate),
    endDate: initialData.endDate ? new Date(initialData.endDate) : null,
    logoId: initialData.logoId ?? null,

    translations:
      initialData.translations?.length > 0
        ? initialData.translations.map((t) => ({
            id: t.id,
            language: t.language,
            description: t.description ?? '',
          }))
        : [{ language: 'en', description: '' }],

    techStackIds: initialData.techStacks?.map((t) => t.techStackId) ?? [],

    roles:
      initialData.roles?.map((r) => ({
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
  };
}

interface CompanyFormProps {
  initialData?: AdminCompany;
  /** Tech-stack picker state, owned by the dialog so its fetch starts on open. */
  techStacks: TechStackOptionsResult;
  onSubmit: (data: CompanyFormValues) => void;
  loading?: boolean;
}

export function CompanyForm({
  initialData,
  techStacks,
  onSubmit,
  loading,
}: CompanyFormProps) {
  const t = useTranslations('dashboard.company');
  const tShared = useTranslations('dashboard.shared');

  // Seeded once, at mount: the dialog mounts this on a loaded record. A later
  // `form.reset` would remount every role's fields (new field-array ids).
  const [defaultValues] = useState(() => toFormValues(initialData));
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues,
  });

  const {
    fields: roles,
    append: appendRole,
    remove: removeRole,
  } = useFieldArray({
    control: form.control,
    name: 'roles',
  });

  // No `onInvalid` handler revealing the erroring language tab: TranslationTabs
  // subscribes to its own errors and reveals itself, at every nesting level.
  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
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
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
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
                <FormControl>
                  <DatePicker
                    value={field.value ?? undefined}
                    onChange={(d) => field.onChange(d || null)}
                  />
                </FormControl>
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
                  options={techStacks.options}
                  selected={field.value || []}
                  onValueChange={field.onChange}
                  placeholder={
                    techStacks.isLoading
                      ? t('dialog.techStackLoading')
                      : t('dialog.techStackPlaceholder')
                  }
                />
              </FormControl>
              {/* An empty option list otherwise reads as "no tech stacks
                  exist", and saving from it drops every association. */}
              {techStacks.isError && (
                <div className="flex items-center gap-2 text-[0.8rem] font-medium text-destructive-text">
                  <span>{t('dialog.techStackError')}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={techStacks.refetch}
                  >
                    {tShared('managerListState.retry')}
                  </Button>
                </div>
              )}
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
            <h3 className="text-sm font-medium">{t('dialog.rolesTitle')}</h3>
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
            {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}{' '}
            {t('dialog.saveButton')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
