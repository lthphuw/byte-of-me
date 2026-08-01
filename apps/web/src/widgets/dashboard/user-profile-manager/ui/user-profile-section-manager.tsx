'use client';

import type { UseFormReturn } from 'react-hook-form';
import { DatePicker , FormControl, FormField, FormItem, FormLabel } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import type { UserProfileFormValues } from '@/entities/user-profile/model/user-profile-schema';

export function UserProfileSectionManager({
  form,
}: {
  form: UseFormReturn<UserProfileFormValues>;
}) {
  const t = useTranslations('dashboard.userProfile');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{t('commonInfo.heading')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('commonInfo.description')}
        </p>
      </div>

      <div className="rounded-xl border bg-background/50 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="birthdate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('commonInfo.birthdateLabel')}</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value ? new Date(field.value) : null}
                    onChange={(date) =>
                      field.onChange(date ? date.toISOString() : null)
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
