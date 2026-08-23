'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `CorrelationScreen`, loading.
 *
 * The same frame as the screen it replaces — `max-w-4xl`, `p-4 md:p-8`,
 * `gap-6` — then the heading, the caveat card, the day accounting and the
 * three measure cards, so nothing moves when the read lands (§14).
 */
export function CorrelationScreenSkeleton() {
  const t = useTranslations('dashboard.health.correlation');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <div className="flex flex-col gap-2">
            <Skeleton aria-hidden className="h-7 w-52" />
            <Skeleton aria-hidden className="h-5 w-40" />
          </div>

          <Skeleton aria-hidden className="h-56 w-full rounded-3xl" />
          <Skeleton aria-hidden className="h-44 w-full rounded-3xl" />
          <Skeleton aria-hidden className="h-80 w-full rounded-3xl" />
          <Skeleton aria-hidden className="h-80 w-full rounded-3xl" />
          <Skeleton aria-hidden className="h-40 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
