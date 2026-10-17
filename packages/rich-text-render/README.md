# @byte-of-me/rich-text-render

Layer 2 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

The server-side renderer of stored rich text, and the client leaves that finish a rendered
article in the browser. There is no root barrel: each entry is a subpath, so a client file
imports exactly the half it needs and the server half never reaches a visitor's bundle.

Server only (no `'use client'` anywhere in the chain; they import the TipTap render schema
from `@byte-of-me/rich-text-schema`, about 1 MB with `@tiptap/html`):

- `./rich-text`: `RichText`, a server component, stored Tiptap JSON to HTML.
- `./rich-text-render`: `renderRichTextHtml`, `renderRichTextDocumentHtml`.

Client-safe, no TipTap:

- `./rich-text-html`: `RichTextHtml`, the printer of already-sanitised HTML and the article
  typography.
- `./mermaid-size`: `svgNaturalSize`, `formatMermaidSize`, `parseMermaidSize` (also read by
  the editor's `MermaidSizeMeasure`).

Client leaves (`'use client'`), loaded only where an article has the thing they draw:

- `./mermaid-blocks`: `MermaidBlocks`, swaps mermaid code blocks for SVG (`mermaid` is
  `import()`ed only when a block exists).
- `./math-renderer`: `MathRenderer`, KaTeX over `data-latex` placeholders (imports the KaTeX
  stylesheet, hence `sideEffects: ["**/*.css"]`).

Specs run from this directory with `bun test`; none needs a DOM, which is the point: the
render specs prove the server path works without a `window`.
