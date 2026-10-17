'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/** Stands in for the `TechStackDialog` form while its record loads: same grid and field sizes. */
export function TechStackFormLoading() {
  const t = useTranslations('dashboard.shared.managerListState');

  return (
    <div className="space-y-4" aria-busy="true" aria-label={t('loading')}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-14 w-14 rounded-lg" />
      </div>
    </div>
  );
}
