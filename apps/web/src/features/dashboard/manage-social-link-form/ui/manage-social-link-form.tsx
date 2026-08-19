'use client';

import { useState } from 'react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import {
  Button,
  ConfirmDeleteDialog,
  DeleteButton,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { UserProfileFormValues } from '@/entities/user-profile/model/user-profile-schema';

interface PendingRemoval {
  index: number;
  platform: string;
}

export function SocialLinksSection({
  form,
}: {
  form: UseFormReturn<UserProfileFormValues>;
}) {
  const t = useTranslations('dashboard.userProfile');
  const tShared = useTranslations('dashboard.shared');
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'socialLinks',
  });
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(
    null
  );

  // Was a native `confirm()`: blocking, unstyled and suppressible in some
  // browsers. A row the user just added and never filled in skips it.
  const requestRemove = (index: number) => {
    const link = form.getValues(`socialLinks.${index}`);
    const platform = link?.platform?.trim() ?? '';

    if (platform || link?.url?.trim()) setPendingRemoval({ index, platform });
    else remove(index);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t('socialLinks.heading')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('socialLinks.description')}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            append({
              platform: '',
              url: '',
              sortOrder: fields.length,
            })
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          {t('socialLinks.addLink')}
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {fields.length === 0 && (
          <div className="rounded-lg border py-8 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              {t('socialLinks.emptyTitle')}
            </p>
            <Button
              onClick={() => append({ platform: '', url: '', sortOrder: 0 })}
            >
              {t('socialLinks.emptyAction')}
            </Button>
          </div>
        )}

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-start gap-3 rounded-lg border bg-background/50 p-3"
          >
            {/* Platform. The row is compact and self-evident on sight, so the
                labels are `sr-only` — but a placeholder is not a label, and
                without one these inputs are unnamed to a screen reader. */}
            <div className="w-32">
              <FormField
                control={form.control}
                name={`socialLinks.${index}.platform`}
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="sr-only">
                      {t('socialLinks.platformLabel')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('socialLinks.platformPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* URL */}
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`socialLinks.${index}.url`}
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="sr-only">
                      {t('socialLinks.urlLabel')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('socialLinks.urlPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Remove */}
            <DeleteButton
              label={t('socialLinks.removeLabel')}
              onClick={() => requestRemove(index)}
            />
          </div>
        ))}
      </div>

      <ConfirmDeleteDialog
        isOpen={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) remove(pendingRemoval.index);
          setPendingRemoval(null);
        }}
        title={t('socialLinks.removeConfirm')}
        description={t('socialLinks.removeConfirmDescription', {
          platform: pendingRemoval?.platform || t('socialLinks.unnamedLink'),
        })}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
