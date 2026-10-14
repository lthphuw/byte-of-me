'use client';

import { useState } from 'react';
import type { Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import {
  Button,
  ConfirmDeleteDialog,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
} from '@byte-of-me/ui';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import { FieldMessage, TextField, TranslationTabs } from '@/shared/ui';

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
  const tShared = useTranslations('dashboard.shared');
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // A task still empty in every language is removed without a dialog.
  const translations = useWatch({
    control,
    name: `roles.${roleIndex}.tasks.${index}.translations`,
  });
  const hasContent = translations.some((translation) =>
    Boolean(translation.content)
  );

  const handleRemove = () => {
    if (hasContent) setConfirmingRemove(true);
    else remove(index);
  };

  return (
    <div className="relative space-y-4 rounded-lg border bg-muted/30 p-4 pt-8">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2"
        aria-label={t('task.removeButton')}
        onClick={handleRemove}
      >
        <X className="h-4 w-4" />
      </Button>

      <FormField
        control={control}
        name={`roles.${roleIndex}.tasks.${index}.sortOrder`}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>{t('task.sortLabel')}</FormLabel>
            <FormControl>
              <Input
                type="number"
                value={Number(field.value)}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === '' ? 0 : Number(e.target.value)
                  )
                }
              />
            </FormControl>
            <FieldMessage message={fieldState.error?.message} />
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

      <ConfirmDeleteDialog
        isOpen={confirmingRemove}
        onClose={() => setConfirmingRemove(false)}
        onConfirm={() => {
          setConfirmingRemove(false);
          remove(index);
        }}
        title={t('task.removeConfirmTitle')}
        description={t('task.removeConfirmDescription')}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
