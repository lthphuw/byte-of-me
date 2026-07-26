'use client';

import { useEffect } from 'react';

const FLASH_CLASS = 'is-flash';
const FLASH_MS = 1600;

/**
 * Wires up the citation markers rendered inside `#{targetId}`.
 *
 * Clicking `[1]` jumps to its bibliography entry; the `↩` on that entry jumps
 * back to the marker the reader actually came from, not just the first one on
 * the page. Both work without this component (they are plain anchors) — this
 * only adds the smooth scroll and the highlight that shows where you landed.
 */
export function BlogCitationLinks({ targetId }: { targetId: string }) {
  useEffect(() => {
    const container = document.getElementById(targetId);
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Remembers which marker a reader used, so `↩` returns to that exact spot.
    const origins = new Map<string, HTMLElement>();
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const flash = (element: HTMLElement) => {
      element.classList.remove(FLASH_CLASS);
      // Force a reflow so re-adding the class restarts the transition.
      void element.offsetWidth;
      element.classList.add(FLASH_CLASS);

      const timer = setTimeout(() => {
        element.classList.remove(FLASH_CLASS);
        timers.delete(timer);
      }, FLASH_MS);
      timers.add(timer);
    };

    const jumpTo = (element: HTMLElement | null) => {
      if (!element) return false;

      element.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });

      if (!element.hasAttribute('tabindex')) element.tabIndex = -1;
      element.focus({ preventScroll: true });
      flash(element);

      return true;
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const marker = target.closest<HTMLElement>('a[data-citation-link]');
      if (marker) {
        const refId = marker.dataset.citationLink;
        if (!refId) return;

        origins.set(refId, marker);
        if (jumpTo(document.getElementById(`ref-${refId}`))) {
          event.preventDefault();
          history.replaceState(null, '', `#ref-${refId}`);
        }
        return;
      }

      const backlink = target.closest<HTMLElement>('a[data-reference-backlink]');
      if (backlink) {
        const refId = backlink.dataset.referenceBacklink;
        if (!refId) return;

        const origin =
          origins.get(refId) ?? document.getElementById(`cite-${refId}`);
        if (jumpTo(origin)) {
          event.preventDefault();
          history.replaceState(null, '', `#cite-${refId}`);
        }
      }
    };

    container.addEventListener('click', handleClick);

    // Someone arriving on a deep link to a reference should see it highlighted.
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('ref-') || hash.startsWith('cite-')) {
      const landing = document.getElementById(hash);
      if (landing) flash(landing);
    }

    return () => {
      container.removeEventListener('click', handleClick);
      timers.forEach(clearTimeout);
    };
  }, [targetId]);

  return null;
}
