import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

function FieldLoading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

/** Stands in for the `FeaturedWorkForm` while its full row loads: the tabs, the fields and the demo pair, at their sizes. */
export function FeaturedWorkFormLoading() {
  const t = useTranslations('dashboard.shared.managerListState');

  return (
    <div className="space-y-6" aria-busy="true" aria-label={t('loading')}>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-14" />
        <Skeleton className="h-9 w-14" />
      </div>

      <FieldLoading />

      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-36 w-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="aspect-video h-auto w-full" />
          <Skeleton className="aspect-video h-auto w-full" />
        </div>
      </div>

      <FieldLoading />
    </div>
  );
}
