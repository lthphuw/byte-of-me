'use client';

import { useEffect } from 'react';

/**
 * Opens the browser's print dialog once `document.fonts.ready` resolves.
 *
 * The font wait is not cosmetic. KaTeX renders equations with its own web
 * fonts, and `MathRenderer` only requests them once it has inserted the glyph
 * spans — printing before they resolve puts fallback glyphs in the PDF, so
 * the maths comes out in the wrong typeface with the wrong metrics. Every
 * print surface renders `MathRenderer` *above* its trigger for that reason:
 * the request has to be in flight before anything waits on it.
 *
 * Used by the print surface (`/print/blogs/[slug]`); the data path, guard and
 * labels stay with the page, not in here.
 */
export function usePrintOnFontsReady(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void document.fonts.ready.then(() => {
      // The tab can be closed, or navigated away from, inside the font wait.
      if (!cancelled) window.print();
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
