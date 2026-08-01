'use client';

import { useState } from 'react';
import { type Control, useFieldArray, useWatch } from 'react-hook-form';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DatePicker,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@byte-of-me/ui';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CompanyTaskItemField } from './company-task-item-field';

import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import { cn } from '@/shared/lib/utils';
import { TextField, TranslationTabs } from '@/shared/ui';

interface CompanyRoleItemFieldProps {
  index: number;
  control: Control<CompanyFormValues>;
  remove: (index: number) => void;
}

export function CompanyRoleItemField({
  index,
  control,
  remove,
}: CompanyRoleItemFieldProps) {
  const t = useTranslations('dashboard.company');
  const [open, setOpen] = useState(true);

  const {
    fields: tasks,
    append: appendTask,
    remove: removeTask,
  } = useFieldArray({
    control,
    name: `roles.${index}.tasks`,
  });

  const title = useWatch({
    control,
    name: `roles.${index}.translations.0.title`,
  });

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border"
    >
      <div className="flex items-center justify-between p-2">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="gap-2">
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                !open && '-rotate-90'
              )}
            />
            <span className="font-medium">
              {title || t('role.fallbackTitle', { index: index + 1 })}
            </span>
          </Button>
        </CollapsibleTrigger>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={t('role.removeButton')}
          onClick={() => remove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CollapsibleContent className="space-y-4 border-t p-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`roles.${index}.startDate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('role.startDateLabel')}</FormLabel>
                <DatePicker
                  value={field.value ?? undefined}
                  onChange={(d) => field.onChange(d || null)}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`roles.${index}.endDate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('role.endDateLabel')}</FormLabel>
                <DatePicker
                  value={field.value ?? undefined}
                  onChange={(d) => field.onChange(d || null)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <TranslationTabs
          control={control}
          name={`roles.${index}.translations`}
          newTranslation={() => ({ language: '', title: '', description: '' })}
          renderFields={(i) => (
            <>
              <TextField
                control={control}
                name={`roles.${index}.translations.${i}.title`}
                label={t('role.titleLabel')}
              />
              <TextField
                control={control}
                name={`roles.${index}.translations.${i}.description`}
                label={t('role.descriptionLabel')}
              />
            </>
          )}
        />

        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{t('role.tasksTitle')}</h4>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                appendTask({
                  sortOrder: tasks.length,
                  translations: [{ language: 'en', content: '' }],
                })
              }
            >
              <Plus className="mr-2 h-3 w-3" />
              {t('role.addTaskButton')}
            </Button>
          </div>

          {tasks.map((task, taskIndex) => (
            <CompanyTaskItemField
              key={task.id}
              roleIndex={index}
              index={taskIndex}
              control={control}
              remove={removeTask}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
