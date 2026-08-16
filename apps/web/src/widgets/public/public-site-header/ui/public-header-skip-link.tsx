'use client';

import { useTranslations } from 'next-intl';

/**
 * The first focusable element on every public page (WCAG 2.4.1, Bypass
 * Blocks). Without it a keyboard user re-tabs the whole header — logo, six nav
 * items, theme and language toggles — on every single navigation.
 *
 * The landmark is resolved on activation rather than through a plain fragment
 * href, because the public layout's `<main>` carries no `id` to point at. The
 * href is kept so the link still reads as one and degrades to a fragment jump
 * the moment that `id` exists; the handler is what actually moves focus, which
 * a fragment jump alone does not reliably do — and if focus stays on the link,
 * the next Tab resumes inside the header and the link has bought nothing.
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
      // Every decoration is `focus:`-prefixed so the resting state is nothing
      // but `sr-only`. `buttonVariants()` would have been the obvious source of
      // the chrome, but its unconditional `h-9 px-4 py-2` outranks `sr-only`'s
      // 1px box in Tailwind's output order (accessibility ships before sizing),
      // leaving a 34x36 clipped rectangle parked over the top-left corner of
      // every page. `focus:h-11` also keeps it above the 44px minimum (§14).
      //
      // `left-8` lines the link up with the container's 2rem gutter, and
      // `z-[10001]` clears the mobile nav trigger (`z-[10000]`), the highest
      // thing this header puts on screen.
      className="sr-only focus:not-sr-only focus:fixed focus:left-8 focus:top-4 focus:z-[10001] focus:inline-flex focus:h-11 focus:items-center focus:rounded-md focus:border focus:border-input focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {t('skipToContent')}
    </a>
  );
}
