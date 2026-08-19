'use client';

import { useTranslations } from 'next-intl';

/**
 * The first focusable element on a nav-heavy signed-in surface (WCAG 2.4.1,
 * Bypass Blocks). Without one, a keyboard user re-tabs the whole sidebar —
 * fifteen controls on `/dashboard`, eight on `/space` — on every navigation.
 *
 * A plain fragment href, unlike `PublicHeaderSkipLink`, which resolves the
 * landmark in a click handler because the public `<main>` carries no `id`.
 * The two callers here own their landmark, so they give it the `id` AND
 * `tabindex="-1"`, and the browser's own fragment jump moves focus — which is
 * the part a fragment alone does not do for a non-focusable target, and the
 * part that decides whether the next Tab resumes in the content or back in the
 * navigation the link was supposed to skip.
 *
 * A client component only because of `useTranslations`: `getTranslations`
 * would pull `next-intl/server` into `space-shell.tsx`, which a client
 * component reaches through the space-shell widget barrel.
 */
export function SkipToContentLink({ targetId }: { targetId: string }) {
  const t = useTranslations('global.header');

  return (
    <a
      href={`#${targetId}`}
      // Every decoration is `focus:`-prefixed so the resting state is nothing
      // but `sr-only` — an unconditional size class would outrank `sr-only`'s
      // 1px box in Tailwind's output order and park a clipped rectangle over
      // the corner of every page. `focus:h-11` keeps it above the 44px minimum
      // (AGENTS §14).
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:h-11 focus:items-center focus:rounded-md focus:border focus:border-input focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {t('skipToContent')}
    </a>
  );
}
