'use client';

import { useState } from 'react';
import { type Control, useFieldArray, useWatch } from 'react-hook-form';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ConfirmDeleteDialog,
  DatePicker,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@byte-of-me/ui';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CompanyTaskItemField } from './company-task-item-field';

import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import { useRevealOnInvalidSubmit } from '@/shared/hooks/use-reveal-on-invalid-submit';
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
  const tShared = useTranslations('dashboard.shared');
  const [open, setOpen] = useState(true);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // Open by default, but a role the author has collapsed unmounts its fields —
  // including the task cards below — so the tabs inside cannot reveal anything
  // until this reopens. Same submit signal, one level up.
  useRevealOnInvalidSubmit(control, `roles.${index}`, () => setOpen(true));

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

  // A role the user just added and never filled in is not worth a
  // confirmation; one carrying a title or tasks takes typing to rebuild.
  // Both values are already subscribed above, so this costs no extra render.
  const hasContent = Boolean(title) || tasks.length > 0;

  const handleRemove = () => {
    if (hasContent) setConfirmingRemove(true);
    else remove(index);
  };

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
          onClick={handleRemove}
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

          <FormField
            control={control}
            name={`roles.${index}.endDate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('role.endDateLabel')}</FormLabel>
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

      <ConfirmDeleteDialog
        isOpen={confirmingRemove}
        onClose={() => setConfirmingRemove(false)}
        onConfirm={() => {
          setConfirmingRemove(false);
          remove(index);
        }}
        title={t('role.removeConfirmTitle')}
        description={t('role.removeConfirmDescription', {
          name: title || t('role.fallbackTitle', { index: index + 1 }),
        })}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </Collapsible>
  );
}
