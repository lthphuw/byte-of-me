'use client';

import { useTranslations } from 'next-intl';

/**
 * First focusable element on the dashboard (WCAG 2.4.1 Bypass Blocks). A plain fragment
 * href: the landmark carries `id` AND `tabindex="-1"`, so the jump itself moves focus.
 */
export function SkipToContentLink({ targetId }: { targetId: string }) {
  const t = useTranslations('global.header');

  return (
    <a
      href={`#${targetId}`}
      // All `focus:`-prefixed so rest is only `sr-only`: an unconditional size class would
      // outrank its 1px box (Tailwind output order) and park a clipped rectangle on every
      // page. `focus:h-9` keeps it at the 44px minimum (AGENTS §14).
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:h-9 focus:items-center focus:rounded-md focus:border focus:border-input focus:bg-background focus:px-3 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {t('skipToContent')}
    </a>
  );
}
