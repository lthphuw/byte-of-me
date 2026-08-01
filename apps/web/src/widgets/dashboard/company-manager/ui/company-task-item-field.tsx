'use client';

import type { Control } from 'react-hook-form';
import {
  Button,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@byte-of-me/ui';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import { TextField, TranslationTabs } from '@/shared/ui';

interface CompanyTaskItemFieldProps {
  roleIndex: number;
  index: number;
  control: Control<CompanyFormValues>;
  remove: (index: number) => void;
}

export function CompanyTaskItemField({
  roleIndex,
  index,
  control,
  remove,
}: CompanyTaskItemFieldProps) {
  const t = useTranslations('dashboard.company');

  return (
    <div className="relative space-y-4 rounded-lg border bg-muted/30 p-4 pt-8">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2"
        aria-label={t('task.removeButton')}
        onClick={() => remove(index)}
      >
        <X className="h-4 w-4" />
      </Button>

      <FormField
        control={control}
        name={`roles.${roleIndex}.tasks.${index}.sortOrder`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('task.sortLabel')}</FormLabel>
            <Input
              type="number"
              value={Number(field.value)}
              onChange={(e) =>
                field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <TranslationTabs
        control={control}
        name={`roles.${roleIndex}.tasks.${index}.translations`}
        newTranslation={() => ({ language: '', content: '' })}
        renderFields={(i) => (
          <TextField
            control={control}
            name={`roles.${roleIndex}.tasks.${index}.translations.${i}.content`}
            label={t('task.contentLabel')}
          />
        )}
      />
    </div>
  );
}
