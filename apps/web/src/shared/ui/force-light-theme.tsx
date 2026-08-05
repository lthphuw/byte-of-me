'use client';

import { useEffect } from 'react';

/**
 * Drops the `dark` class from `<html>` for as long as this is mounted, and
 * puts it back on the way out.
 *
 * Blunt, and necessary. The rich-text renderer styles itself with Tailwind
 * `dark:` VARIANTS — `dark:prose-invert`, `dark:text-neutral-200`,
 * `dark:[&_a]:text-neutral-50` — which compile to `.dark &` selectors keyed
 * on that one class. A nested wrapper cannot override a selector: redeclaring
 * the CSS custom properties on a subtree (which `force-light-surface` does)
 * fixes everything that reads a variable and nothing that reads the variant.
 * Measured on `/print/notes/[id]`: with only the variable override in place,
 * `<main>` computed to `rgb(10,10,10)` on white as intended while every `h2`
 * and `strong` inside it still computed to `rgb(255,255,255)` — invisible on
 * screen, and blank in the PDF.
 *
 * Only for surfaces that are inherently light: paper has no dark mode. Do not
 * reach for this to "fix" a dark-mode bug on a normal page.
 *
 * The user's stored preference is untouched — this manipulates the class, not
 * next-themes' state — so returning to any other page restores their theme.
 */
export function ForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');

    // A one-shot removal in an effect is NOT enough, and this was measured:
    // `next-themes`' provider sits above this in the tree, React runs child
    // effects before parent ones, so the provider re-applied `dark` straight
    // after this removed it and the page rendered dark anyway. The observer
    // also covers a later theme change (another tab, or the OS switching
    // scheme) while a print preview is open.
    const strip = () => {
      if (root.classList.contains('dark')) root.classList.remove('dark');
    };
    strip();

    const observer = new MutationObserver(strip);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      if (wasDark) root.classList.add('dark');
    };
  }, []);

  return null;
}
