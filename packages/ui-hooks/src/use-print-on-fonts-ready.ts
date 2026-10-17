'use client';

import { useEffect } from 'react';

/**
 * Opens the print dialog once `document.fonts.ready` resolves. KaTeX requests its web fonts
 * only after `MathRenderer` inserts its spans, so printing earlier puts fallback glyphs in
 * the PDF; every print surface renders `MathRenderer` above its trigger for that reason.
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
