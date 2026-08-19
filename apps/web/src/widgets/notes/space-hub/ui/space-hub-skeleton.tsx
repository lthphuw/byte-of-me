'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `SpaceHub`, loading. Mirrors that component's four bands — greeting, the
 * three stat cards, and the module grid — with the same wrappers and the same
 * gaps, so the real hub swapping in shifts nothing.
 *
 * The module grid is THREE blocks, not two. It used to draw two, while
 * `SpaceHub` renders the Recent card plus one card per module (notes, graph):
 * at `lg` the real layout is two columns over two rows and the placeholder was
 * two columns over one, so a cold `/space` on a desktop jumped a full card row
 * at hydration — the exact shift this file exists to prevent.
 *
 * A client component for the same reason `NoteEditorSkeleton` is one: the
 * container needs a translated accessible name, and `loading.tsx` cannot be
 * async without the fallback itself suspending.
 */
export function SpaceHubSkeleton() {
  const t = useTranslations('dashboard.space.hub');

  return (
    // `aria-busy` + a name on the container, matching `NoteEditorSkeleton` and
    // `BlogFormSkeleton`; the bars themselves stay decorative. The whole
    // subtree used to be `aria-hidden` with nothing in its place, which left a
    // screen reader on a page with no perceivable content and no indication
    // that anything was on its way.
    <div
      className="min-h-0 flex-1 overflow-y-auto"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
        {/* The greeting row. `flex`, not a plain stack: the real header puts
            the mobile nav trigger beside the heading, and a placeholder that
            ignores it reflows the title on a phone when the trigger appears. */}
        <div className="flex items-center gap-2">
          <Skeleton aria-hidden className="size-9 shrink-0 md:hidden" />
          <div className="space-y-2">
            <Skeleton aria-hidden className="h-7 w-64" />
            <Skeleton aria-hidden className="h-4 w-40" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton aria-hidden className="h-[72px] w-full" />
          <Skeleton aria-hidden className="h-[72px] w-full" />
          <Skeleton aria-hidden className="h-[72px] w-full" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent notes: five rows and a header. */}
          <Skeleton aria-hidden className="h-64 w-full" />
          {/* One per module card — header plus description, no body. */}
          <Skeleton aria-hidden className="h-32 w-full" />
          <Skeleton aria-hidden className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
