'use client';

import { useLayoutEffect } from 'react';
import katex from 'katex';

import 'katex/dist/katex.min.css';

/**
 * Turns the `data-latex` placeholders in server-rendered rich text into real
 * KaTeX.
 *
 * `renderRichTextHtml` cannot do this itself: KaTeX emits a deep span tree
 * positioned entirely with inline `style`, and `sanitize.ts` strips `style`
 * from every rendered document on purpose. Rather than loosen that
 * repo-wide for one node type, the server emits the LaTeX source and this
 * upgrades it in the browser — the same division the editor already uses,
 * where KaTeX runs in a node view.
 *
 * `useLayoutEffect`, not `useEffect`: on the print route a sibling triggers
 * `window.print()` behind `document.fonts.ready`, and the KaTeX web fonts are
 * only requested once this has inserted the glyph spans. Running before paint
 * guarantees that request is in flight before anything starts waiting on it —
 * with `useEffect` the font wait can resolve against a page that has no maths
 * on it yet, and the PDF gets fallback glyphs.
 *
 * Idempotent by construction: KaTeX replaces each element's contents, so the
 * `data-latex` attribute stays but a second pass simply re-renders the same
 * formula.
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
