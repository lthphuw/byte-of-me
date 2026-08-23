'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `ExerciseScreen`, loading.
 *
 * The same classes as the screen it replaces — `max-w-4xl`, `p-4 md:p-8`,
 * `gap-6`, a 44px search row, a 44px filter row, then the two-column card grid
 * — because a skeleton whose rhythm differs from the real component makes the
 * page jump when the data lands, which is the exact shift a skeleton exists to
 * prevent (§14).
 *
 * The bottom bar is drawn for the same reason it is drawn in the sleep
 * skeleton: it is where the thumb already is, and a bar that arrives late
 * moves the target out from under it. It disappears at `lg` exactly as the
 * real one does.
 */
export function ExerciseScreenSkeleton() {
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
            <Skeleton aria-hidden className="h-8 w-40" />
            <Skeleton aria-hidden className="h-4 w-64" />
          </div>

          <div className="flex flex-col gap-3">
            <Skeleton aria-hidden className="h-11 w-full rounded-md" />
            <Skeleton aria-hidden className="h-11 w-full rounded-2xl" />
            <Skeleton aria-hidden className="h-11 w-44 rounded-2xl" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                aria-hidden
                className="h-[8.5rem] w-full rounded-2xl"
              />
            ))}
          </div>

          <div className="hidden lg:block">
            <Skeleton aria-hidden className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Mirrors the real bar's own safe-area inset — see
          `exercise-catalog.tsx` — rather than relying on `SpaceShell`'s
          `#space-content`, which does not carry one. */}
      <div className="shrink-0 border-t px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto w-full max-w-4xl">
          <Skeleton aria-hidden className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
