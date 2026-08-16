'use client';

import { useLayoutEffect } from 'react';

/**
 * Freezes the page behind an overlay, without moving it.
 *
 * `overflow: hidden` alone takes the scrollbar away, and on any platform that
 * draws a classic scrollbar — Windows, Linux, a macOS mouse — the viewport
 * grows by its width the moment the overlay opens and shrinks again when it
 * closes. Everything on the page jumps sideways, twice, for every menu.
 *
 * So the width the scrollbar was occupying is measured and handed back as
 * padding. `body` covers normal content; `--scrollbar-lock` covers the rest,
 * because a `position: fixed` element is laid out against the viewport and
 * never sees the body's padding — the header is the case that matters here.
 *
 * Preferred over `scrollbar-gutter: stable`, which would solve it in one CSS
 * line but only from Safari 18.2, and would reserve the gutter on every page
 * whether or not anything ever opens.
 */
export function useLockBody(enabled?: boolean) {
  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const { body, documentElement: root } = document;
    // Zero on an overlay scrollbar (a trackpad Mac, a phone), where there is
    // nothing to compensate for and adding padding would BE the shift.
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    const originalOverflow = body.style.overflow;
    const originalPaddingRight = body.style.paddingRight;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
      root.style.setProperty('--scrollbar-lock', `${scrollbarWidth}px`);
    }

    return () => {
      body.style.overflow = originalOverflow;
      body.style.paddingRight = originalPaddingRight;
      root.style.removeProperty('--scrollbar-lock');
    };
  }, [enabled]);
}
