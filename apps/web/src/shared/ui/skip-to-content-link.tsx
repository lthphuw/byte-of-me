'use client';

import { useTranslations } from 'next-intl';

/**
 * The first focusable element on the dashboard (WCAG 2.4.1, Bypass Blocks):
 * without it a keyboard user re-tabs the whole sidebar on every navigation.
 * A plain fragment href: the landmark carries the `id` AND `tabindex="-1"`, so
 * the browser's own jump moves focus and the next Tab resumes in the content.
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
