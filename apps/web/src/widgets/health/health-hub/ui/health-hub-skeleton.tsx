'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `HealthHub`, loading. Same frame, same container width, same two-column
 * grid at `lg`, same padding, so the real screen swapping in moves nothing —
 * including the bottom bar, which is the one element a shift would be felt
 * through, since a thumb is already resting on it. §14: a skeleton that does
 * not use the component's own classes is the shift it exists to prevent.
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
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-8">
            <div className="flex min-w-0 flex-col gap-6">
              {/* The hero: a 160px ring inside a padded card. */}
              <div className="flex flex-col items-center gap-3 rounded-xl border p-6">
                <Skeleton aria-hidden className="size-40 rounded-full" />
                <Skeleton aria-hidden className="h-4 w-28" />
                <Skeleton aria-hidden className="h-5 w-36" />
              </div>

              <div className="hidden lg:block">
                <Skeleton aria-hidden className="h-14 w-full" />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-6 border-t pt-6 lg:border-t-0 lg:pt-0">
              <div className="grid grid-cols-2 gap-3">
                <Skeleton aria-hidden className="h-[132px] w-full" />
                <Skeleton aria-hidden className="h-[132px] w-full" />
              </div>

              <Skeleton aria-hidden className="h-[156px] w-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto w-full max-w-4xl">
          <Skeleton aria-hidden className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
