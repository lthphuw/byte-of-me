'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `HealthHub`, loading. Same frame, same padding, same grid, so the real
 * screen swapping in moves nothing — including the bottom bar, which is the
 * one element a shift would be felt through, since a thumb is already resting
 * on it.
 *
 * A client component for the reason `SpaceHubSkeleton` documents: the
 * container needs a translated accessible name, and `loading.tsx` cannot be
 * async without the fallback itself suspending.
 */
export function HealthHubSkeleton() {
  const t = useTranslations('dashboard.health');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton aria-hidden className="h-[104px] w-full" />
            <Skeleton aria-hidden className="h-[104px] w-full" />
            <Skeleton aria-hidden className="col-span-2 h-[88px] w-full" />
          </div>

          <Skeleton aria-hidden className="h-[156px] w-full" />
        </div>
      </div>

      <div className="shrink-0 border-t px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto w-full max-w-2xl">
          <Skeleton aria-hidden className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
