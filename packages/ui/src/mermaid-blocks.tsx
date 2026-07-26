'use client';

import { type ReactNode, useEffect, useRef } from 'react';

/**
 * Progressive enhancement for mermaid diagrams in rendered rich text.
 *
 * The server renders a mermaid snippet as a plain
 * `<pre><code class="language-mermaid">` block; this wrapper finds those
 * blocks after mount and swaps each for the drawn SVG. The `mermaid` library
 * (~500 KB) is `import()`ed only when at least one block exists on the page,
 * so pages without diagrams never download it. When rendering fails (syntax
 * error in the snippet) the code block is left as-is — readable source beats
 * a broken image.
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
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: isDark ? 'dark' : 'neutral',
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

        try {
          const { svg } = await mermaid.render(
            `mermaid-${(seq += 1)}-${Math.random().toString(36).slice(2, 8)}`,
            source
          );
          if (cancelled) return;

          const host =
            pre.nextElementSibling instanceof HTMLElement &&
            pre.nextElementSibling.dataset.mermaidHost === 'true'
              ? pre.nextElementSibling
              : document.createElement('div');
          host.dataset.mermaidHost = 'true';
          host.className = 'my-6 flex justify-center overflow-x-auto';
          host.innerHTML = svg;

          if (host !== pre.nextElementSibling) {
            pre.after(host);
          }
          // Keep the source in the DOM (hidden) so a theme switch can redraw.
          pre.dataset.mermaidSource = source;
          pre.style.display = 'none';
        } catch {
          // Invalid diagram: leave the source code block visible.
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
