'use client';

import { useEffect } from 'react';

/**
 * Drops `dark` from `<html>` while mounted (print only: paper has no dark mode), then
 * restores it. A subtree variable override cannot beat `dark:` variants (`.dark &`):
 * measured `<main>` rgb(10,10,10) but every h2/strong still rgb(255,255,255).
 */
export function ForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');

    // A one-shot removal is not enough (measured): the next-themes provider sits above,
    // its effect runs after this child's and re-applies `dark`. The observer also covers
    // a later theme change (other tab, OS scheme) while a preview is open.
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
