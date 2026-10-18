'use client';

import { useTranslations } from 'next-intl';

/**
 * First focusable element on every public page (WCAG 2.4.1, Bypass Blocks): skips the header tabs.
 * The handler resolves `<main>` (it has no `id`) and moves focus; a fragment jump alone does not
 * reliably do that, and focus left on the link makes the next Tab resume inside the header.
 */
export function PublicHeaderSkipLink() {
  const t = useTranslations('global.header');

  const focusMainLandmark = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const main = document.querySelector('main');
    if (!main) return;

    event.preventDefault();
    // -1: the landmark takes focus programmatically without ever joining the
    // tab order itself.
    main.setAttribute('tabindex', '-1');
    main.focus();
  };

  return (
    <a
      href="#main-content"
      onClick={focusMainLandmark}
      // Decoration is all `focus:`-prefixed so rest is plain `sr-only`: `buttonVariants()`'s `h-9`
      // outranks its 1px box in Tailwind order, leaving a 34x36 clipped rectangle at top-left.
      // `h-9`: a keyboard-only control. `z-[10001]` clears the mobile nav trigger (`z-[10000]`).
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10001] focus:inline-flex focus:h-9 focus:items-center focus:rounded-md focus:border focus:border-input focus:bg-background focus:px-3 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {t('skipToContent')}
    </a>
  );
}
