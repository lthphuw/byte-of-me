'use client';

import { useLayoutEffect } from 'react';

/**
 * Freezes the page behind an overlay: hiding overflow drops a classic scrollbar, so its width is
 * handed back as `body` padding and `--scrollbar-lock` (fixed elements ignore body padding).
 * Not `scrollbar-gutter: stable`: Safari 18.2+ only, and it reserves the gutter on every page.
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
