'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { EducationAchievementsFieldLoading } from './education-achievements-field-loading';

/** Stands in for `EducationForm` while the full entry loads: the same sections, in the same order. */
export function EducationFormLoading() {
  const t = useTranslations('dashboard.shared.managerListState');

  return (
    <div className="space-y-8" aria-busy="true" aria-label={t('loading')}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-14 w-14 rounded-lg" />
        </div>
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t pt-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>

      <EducationAchievementsFieldLoading />
    </div>
  );
}
