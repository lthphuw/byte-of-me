'use client';

import { enUS, vi } from 'react-day-picker/locale';
import { DatePicker, MultiSelect } from '@byte-of-me/ui';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

// `packages/ui` has no i18n context, so its pickers take their text as props.
// These two supply it from `components.*`; call them where a picker used to go.

export function LocalizedDatePicker(
  props: Omit<
    React.ComponentProps<typeof DatePicker>,
    'placeholder' | 'formatDate' | 'calendarLocale'
  >
) {
  const t = useTranslations('components.datePicker');
  const format = useFormatter();
  const locale = useLocale();

  return (
    <DatePicker
      {...props}
      placeholder={t('placeholder')}
      formatDate={(date) => format.dateTime(date, { dateStyle: 'long' })}
      calendarLocale={locale === 'vi' ? vi : enUS}
    />
  );
}

export function LocalizedMultiSelect(
  props: Omit<
    React.ComponentProps<typeof MultiSelect>,
    'searchPlaceholder' | 'emptyLabel' | 'removeLabel'
  >
) {
  const t = useTranslations('components.multiSelect');

  return (
    <MultiSelect
      {...props}
      searchPlaceholder={t('search')}
      emptyLabel={t('empty')}
      removeLabel={(label) => t('remove', { label })}
    />
  );
}
