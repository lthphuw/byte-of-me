'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `RoutinesScreen`, loading.
 *
 * The same frame classes as the screen it stands in for — `max-w-4xl`,
 * `p-4 md:p-8`, `gap-6`, the 44px archived toggle, then a column of 32px-radius
 * cards — so nothing moves when the routines arrive. A skeleton that does not
 * match the component's rhythm causes the jump it exists to prevent (§14).
 */
export function RoutinesScreenSkeleton() {
  const t = useTranslations('dashboard.health');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <div className="space-y-2">
            <Skeleton aria-hidden className="h-8 w-36" />
            <Skeleton aria-hidden className="h-4 w-56" />
          </div>

          <Skeleton aria-hidden className="h-11 w-52 rounded-2xl" />

          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                aria-hidden
                className="h-52 w-full rounded-3xl"
              />
            ))}
          </div>

          <div className="hidden lg:block">
            <Skeleton aria-hidden className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>

      {/* `pb-2` only, not `env(safe-area-inset-bottom)`: `SpaceShell`'s
          `#space-content` already carries the inset for the whole column;
          see the real component this mirrors. */}
      <div className="shrink-0 border-t px-4 pb-2 pt-2 lg:hidden">
        <div className="mx-auto w-full max-w-4xl">
          <Skeleton aria-hidden className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
