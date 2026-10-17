# @byte-of-me/rich-text-schema

Layer 1 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

The schema the TipTap editor and the server-side renderer share: `renderExtensions`,
`sharedExtensions`, the `*Base` nodes the editor extends, citation numbering and the
numeric-column and header-scope rules, from the root (`src/index.ts`). It is server-safe:
no `react`, no `'use client'`, no `mermaid` or `katex` anywhere in its import chain
(`noReact` in `boundaries.json`).

Two light helpers are subpaths, not part of the root, so a client component that needs
them never pulls TipTap into a public bundle:

- `@byte-of-me/rich-text-schema/sanitize`: `sanitizeHtml`, `escapeHtml`.
- `@byte-of-me/rich-text-schema/rich-text-content`: `parseRichTextContent`,
  `toEditorContent`, `fromEditorContent`, `richTextToPlainText`, `isRichTextBlank`,
  `collectImageSources` (its only TipTap import is a type).

Specs run from this directory with `bun test`; none needs a DOM.
