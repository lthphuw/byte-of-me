'use client';

import { type ReactNode, useEffect, useRef } from 'react';

import { type MermaidSize, parseMermaidSize } from './mermaid-size';

/**
 * Progressive enhancement: swaps `pre > code.language-mermaid` blocks for the drawn SVG after
 * mount. `mermaid` (~500 KB) is `import()`ed only when a block exists; on a render error the
 * source stays. A block with `data-mermaid-size` gets a pulsing box of that size first.
 */
export function MermaidBlocks({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const blocks = Array.from(
      root.querySelectorAll<HTMLElement>('pre > code.language-mermaid')
    );
    if (blocks.length === 0) return;

    let cancelled = false;
    let seq = 0;

    const render = async () => {
      const { default: mermaid } = await import('mermaid');
      if (cancelled) return;

      const isDark = document.documentElement.classList.contains('dark');
      // Mermaid's dark theme hard-codes its text to #ccc, 4.4:1 on the dark page.
      // khroma wants the comma form, so the triplet is rejoined.
      const foreground = getComputedStyle(document.documentElement)
        .getPropertyValue('--foreground')
        .trim()
        .split(/\s+/)
        .join(', ');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: isDark ? 'dark' : 'neutral',
        themeVariables: isDark
          ? { textColor: `hsl(${foreground})` }
          : undefined,
        fontFamily: 'inherit',
        // On a parse error mermaid injects its own "Syntax error in text"
        // graphic into the DOM even when render() throws. Suppress that —
        // our fallback is the readable source block.
        suppressErrorRendering: true,
      });

      for (const code of blocks) {
        const pre = code.closest('pre');
        if (!pre || !pre.parentNode) continue;

        const source =
          pre.dataset.mermaidSource ?? code.textContent?.trim() ?? '';
        if (!source) continue;

        // Reserve the box before the library has drawn anything, on the first draw
        // only: a theme redraw keeps the diagram it already has until the new one lands.
        const size = parseMermaidSize(pre.dataset.mermaidSize);
        if (size && !hostOf(pre)) {
          createHost(pre);
        }
        const reserved = hostOf(pre);
        if (size && reserved && !reserved.dataset.mermaidDrawn) {
          reserve(reserved, size);
          pre.style.display = 'none';
        }

        try {
          const { svg } = await mermaid.render(
            `mermaid-${(seq += 1)}-${Math.random().toString(36).slice(2, 8)}`,
            source
          );
          if (cancelled) return;

          const host = hostOf(pre) ?? createHost(pre);
          release(host);
          host.innerHTML = svg;
          host.dataset.mermaidDrawn = 'true';

          // Keep the source in the DOM (hidden) so a theme switch can redraw.
          pre.dataset.mermaidSource = source;
          pre.style.display = 'none';
        } catch {
          // Invalid diagram: back to the readable source. A diagram drawn before
          // (a theme redraw) keeps its last good drawing instead.
          const host = hostOf(pre);
          if (host?.dataset.mermaidDrawn) continue;
          host?.remove();
          pre.style.display = '';
        }
      }
    };

    void render();

    // Redraw with the matching mermaid theme when the site theme flips.
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === 'class')) void render();
    });
    observer.observe(document.documentElement, { attributes: true });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}

const DRAWN_CLASS = 'my-6 flex justify-center overflow-x-auto';
const PENDING_CLASS =
  'mx-auto my-6 rounded-md bg-muted motion-safe:animate-pulse';

/** The host made beside a source block, if there is one. */
function hostOf(pre: HTMLElement): HTMLElement | null {
  const next = pre.nextElementSibling;
  return next instanceof HTMLElement && next.dataset.mermaidHost === 'true'
    ? next
    : null;
}

function createHost(pre: HTMLElement): HTMLElement {
  const host = document.createElement('div');
  host.dataset.mermaidHost = 'true';
  host.className = DRAWN_CLASS;
  pre.after(host);
  return host;
}

/**
 * The diagram's box before it is drawn. Mermaid caps its SVG at the viewBox width, so
 * the box is capped the same way: the width is the smaller of the column and the
 * diagram, and the height follows from the diagram's own ratio.
 */
function reserve(host: HTMLElement, size: MermaidSize) {
  host.className = PENDING_CLASS;
  host.style.width = `min(100%, ${size.width}px)`;
  host.style.aspectRatio = `${size.width} / ${size.height}`;
}

function release(host: HTMLElement) {
  host.className = DRAWN_CLASS;
  host.style.width = '';
  host.style.aspectRatio = '';
}
