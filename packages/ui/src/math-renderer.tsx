'use client';

import { useLayoutEffect } from 'react';
import katex from 'katex';

import 'katex/dist/katex.min.css';

/**
 * Upgrades `data-latex` placeholders to KaTeX in the browser (KaTeX needs inline `style`, which
 * `sanitize.ts` strips). `useLayoutEffect`, not `useEffect`: print waits on `document.fonts.ready`
 * and KaTeX fonts load only once glyph spans exist, else the PDF gets fallback glyphs. Idempotent.
 */
export function MathRenderer() {
  useLayoutEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-latex]');

    for (const element of nodes) {
      const latex = element.getAttribute('data-latex');
      if (!latex) continue;

      katex.render(latex, element, {
        displayMode: element.getAttribute('data-type') === 'block-math',
        // Never throw: a malformed formula renders in KaTeX's error styling
        // and the rest of the document is unaffected. An exception here would
        // take down the whole page for one bad `$`.
        throwOnError: false,
      });
    }
  }, []);

  return null;
}
