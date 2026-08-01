'use client';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

export function MediaLibraryEmpty() {
  const t = useTranslations('dashboard.media');

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t('empty.title')}</EmptyTitle>
        <EmptyDescription>{t('empty.description')}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
