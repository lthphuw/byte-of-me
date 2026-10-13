'use client';

import { type Control, useFieldArray } from 'react-hook-form';
import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
} from '@byte-of-me/ui';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ProjectFromValues } from '@/entities/project/model';
import { FieldMessage, TextField } from '@/shared/ui';

interface ProjectCoauthorFieldsProps {
  control: Control<ProjectFromValues>;
}

/** Repeatable co-author rows for the project dialog. */
export function ProjectCoauthorFields({ control }: ProjectCoauthorFieldsProps) {
  const t = useTranslations('dashboard.project');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'coauthors',
  });

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('coauthors.title')}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 can-hover:min-h-9"
          onClick={() => append({ fullName: '', email: '' })}
        >
          <Plus /> {t('coauthors.addButton')}
        </Button>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_1fr_auto]"
        >
          <TextField
            control={control}
            name={`coauthors.${index}.fullName`}
            label={t('coauthors.nameLabel')}
            placeholder={t('coauthors.namePlaceholder')}
          />
          {/* type="text": a native email check would block submit before the zod message shows. */}
          <FormField
            control={control}
            name={`coauthors.${index}.email`}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t('coauthors.emailLabel')}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="email"
                    placeholder={t('coauthors.emailPlaceholder')}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FieldMessage message={fieldState.error?.message} />
              </FormItem>
            )}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="min-h-11 min-w-11 can-hover:min-h-9 can-hover:min-w-9 md:mt-8"
            onClick={() => remove(index)}
            aria-label={t('coauthors.removeButton')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
