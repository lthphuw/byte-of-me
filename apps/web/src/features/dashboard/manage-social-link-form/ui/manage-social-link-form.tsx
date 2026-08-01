'use client';

import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Button , DeleteButton , FormControl, FormField, FormItem , Input } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { UserProfileFormValues } from '@/entities/user-profile/model/user-profile-schema';

export function SocialLinksSection({
  form,
}: {
  form: UseFormReturn<UserProfileFormValues>;
}) {
  const t = useTranslations('dashboard.userProfile');
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'socialLinks',
  });

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
            className="flex items-center gap-3 rounded-lg border bg-background/50 p-3"
          >
            {/* Platform */}
            <div className="w-32">
              <FormField
                control={form.control}
                name={`socialLinks.${index}.platform`}
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input
                        placeholder={t('socialLinks.platformPlaceholder')}
                        {...field}
                      />
                    </FormControl>
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
                    <FormControl>
                      <Input
                        placeholder={t('socialLinks.urlPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Remove */}
            <DeleteButton
              onClick={() => {
                if (confirm(t('socialLinks.removeConfirm'))) remove(index);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
