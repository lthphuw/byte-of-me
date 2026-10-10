# packages/ui (`@byte-of-me/ui`)

> Shared UI package: shadcn-style primitives, TipTap rich-text editor and renderer, motion, hooks. Source: `packages/ui/src/`, `packages/ui/package.json`, `packages/ui/bunfig.toml`, `packages/ui/happydom.ts`.

## Layout

```
packages/ui/
├── package.json             exports map = the public surface (table below)
├── bunfig.toml              [test] preload = ["./happydom.ts"], resolved against cwd
├── happydom.ts              GlobalRegistrator.register(): DOM for *.spec.tsx
└── src/
    ├── index.ts             root barrel; omits rich-text*, rich-text-editor, mermaid, math
    ├── <name>.tsx           one file per primitive: shadcn-style wrappers + app-neutral composites
    ├── rich-text.tsx        RichText: server component, stored Tiptap JSON -> HTML
    ├── rich-text-html.tsx   RichTextHtml: client-safe printer of already-sanitised HTML
    ├── rich-text-render.ts  renderRichTextHtml, renderRichTextDocumentHtml: server only
    ├── mermaid-blocks.tsx   MermaidBlocks: client; swaps mermaid blocks for SVG (lazy import); reserves a box of the stored size first
    ├── mermaid-size.ts      svgNaturalSize / parseMermaidSize: a diagram's WxH, the `data-mermaid-size` attribute
    ├── math-renderer.tsx    MathRenderer: client; KaTeX over data-latex placeholders
    ├── hooks/               use-clipboard, use-debounce, use-intersection, use-lock-body, use-media-query
    ├── lib/                 cn, sanitize, rich-text-content codec, markdown-format, reduced-motion
    ├── motion/              MotionProvider (LazyMotion + reducedMotion), tokens, variants, transitions
    └── rich-text-editor/tiptap/
        ├── rich-text-editor.tsx   RichTextEditor + createExtensions(): the editor schema
        ├── render-extensions.ts   renderExtensions: server-safe mirror of the editor schema
        ├── extensions/            node/mark definitions; references/ = citations and bibliography
        ├── toolbars/              one button per file; editor-toolbar.tsx registers them
        ├── mobile-tools.tsx, editor-preview.tsx, paste-presentation.ts, markdown-anchor.ts
        └── editor-surface.css     editor and article styles (imported by the editor)
```

### Subpath exports

| Import path | Use it when | Why (AGENTS §7) |
| --- | --- | --- |
| `@byte-of-me/ui` | server code, or a non-public client file, needs several primitives | barrel: a readability concern, not a bundle one; TipTap-free (Gotchas 1) |
| `@byte-of-me/ui/lib/utils` | you need `cn()` | not a §7 subpath; pure, safe anywhere |
| `@byte-of-me/ui/lib/sanitize` | escaping or sanitising HTML in server code | listed in §7; pure |
| `@byte-of-me/ui/lib/rich-text-content` | parsing or blank-checking a stored rich-text column | type-only TipTap import; safe anywhere |
| `@byte-of-me/ui/lib/markdown-format` | tidying markdown source in the editor's markdown mode | not barrel-exported; pure |
| `@byte-of-me/ui/lib/prefers-reduced-motion` | any programmatic scroll (`scrollIntoViewBehavior`) | §14: CSS cannot cover a literal `behavior: 'smooth'` |
| `@byte-of-me/ui/rich-text-editor` | a dashboard form edits rich text (reach it via `LazyRichTextEditor`) | listed in §7: the whole editor must stay off public pages |
| `@byte-of-me/ui/rich-text` | a server component renders stored rich text | listed in §7: load-bearing boundary; server-only schema |
| `@byte-of-me/ui/rich-text-html` | a client component prints HTML a server already rendered | presentational; no TipTap |
| `@byte-of-me/ui/rich-text-render` | a server action or loader returns sanitised HTML | server only (`generateHTML`) |
| `@byte-of-me/ui/mermaid-blocks`, `@byte-of-me/ui/math-renderer` | an article body has mermaid blocks or math | client leaves; not barrel-exported |
| `@byte-of-me/ui/motion` | public UI needs `MotionProvider`, tokens or variants | listed in §7; `m.*` features load lazily |
| `@byte-of-me/ui/hooks/<name>` | one hook | listed in §7 (`./hooks/*`); import the file, not an index |
| `@byte-of-me/ui/<name>` | one top-level `.tsx` primitive (`button`, `shell`) | `./*` wildcard; leaf import |

### Rich-text extension sets

- Editor: `createExtensions()` at `packages/ui/src/rich-text-editor/tiptap/rich-text-editor.tsx:95`, called inside a `useMemo` at `:772`. StarterKit (heading, codeBlock, link, underline off), CodeBlockLowlight, CustomHeading, Placeholder, TextAlign, TextStyle, Sub/Superscript, Underline, Link, Color, Highlight (multicolor), Image, ImageGroup, ImagePlaceholder, SearchAndReplace, Typography, TableKit (not resizable), NumericTableColumns, TableHeaderScopes, Markdown, Citation, ReferenceList.
- Conditional: math when `withMath` (`:151`); TableOfContents unless `compact` (`:784`); LinkSuggestion when `onLinkTrigger` (`:777`).
- Render: `renderExtensions` at `packages/ui/src/rich-text-editor/tiptap/render-extensions.ts:263`. Same node and mark names via `*Base` / `Render*` / `ScopedTable` variants. No Placeholder, SearchAndReplace, Markdown, TableOfContents, LinkSuggestion or node views. Math always on.
- Math: `extensions/math.ts` replaces the upstream input rules: `$…$` inline, `$$…$$` block.

### Flat files

- Primitives (shadcn-style wrappers over Radix or a third-party lib): alert-dialog, avatar, badge, breadcrumb, button, calendar, card, carousel, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, input, label, popover, scroll-area, select, separator, sheet, skeleton, sonner, switch, table, tabs, textarea, toggle, tooltip.
- Composites: auto-growing-text-area, confirm-delete-dialog, copy-button, date-picker, delete-button, edit-button, empty, expandable-text, icons (`Icons` map), image-placeholder, loading, multi-select, pagination, shell (`ShellBase`), submit-button.

## Key flows

- Public rich text: `RichText` (`packages/ui/src/rich-text.tsx:22`) → `renderRichTextHtml` (`packages/ui/src/rich-text-render.ts:50`) → `generateHTML(…, renderExtensions)` after citation numbering and numeric-column marking (`rich-text-render.ts:26-29`) → `sanitizeHtml` (`packages/ui/src/lib/sanitize.ts:121`) → `RichTextHtml` (`packages/ui/src/rich-text-html.tsx:50`). The full variant reserves `aspect-[auto_16/9]` on the muted surface for every body `<img>` (`rich-text-html.tsx`, the "Images / media" class group). A blog post also passes `imageSizes` to `RichText`: `renderRichTextHtml` writes each image's stored size as an inline `aspect-ratio` after sanitizing (`lib/image-ratios.ts`, `withImageRatios`), so the box is exact before the file draws. An image with no media row keeps the 16:9 box. Mermaid code blocks carry `data-mermaid-size="WxH"`, written by the editor's `MermaidSize` extension (`rich-text-editor/tiptap/extensions/mermaid-size.ts`) once a diagram's text changes while the editor is focused, and kept by `sanitizeHtml` only when it matches `PATTERN_ATTRS`. Blocks saved before that carry no size and still swap in unreserved; they gain one the next time their author edits the diagram.
- Client needing rendered rich text: a server action returns `renderRichTextHtml` output; the client prints it with `RichTextHtml` (e.g. `apps/web/src/entities/project/ui/project-timeline-item.tsx:6`).
- Dashboard editing: `LazyRichTextEditor` (`apps/web/src/shared/ui/lazy-rich-text-editor.tsx:16`, `ssr: false`) → `RichTextEditor` (`packages/ui/src/rich-text-editor/tiptap/rich-text-editor.tsx:501`). Forms seed with `toEditorContent` and save `fromEditorContent(json)` (`apps/web/src/widgets/dashboard/project-manager/ui/project-form.tsx:241-243`).
- Stored value parsing: `parseRichTextContent` accepts any object; legacy plain text passes through and becomes a paragraph (`packages/ui/src/lib/rich-text-content.ts:23,44`).
- Motion: `MotionProvider` (`packages/ui/src/motion/motion-provider.tsx:19`) is mounted at the app root (`apps/web/src/app/providers/global-provider.tsx:24`). It lazy-loads `domAnimation` (`motion-provider.tsx:9-10`) and sets `reducedMotion="user"` (`:22`).
- Scroll reveal: `fadeUp` starts at `motionOpacity.placeholder` (0.2), not 0, so a block below the fold holds its space as a faded placeholder until it reveals (`packages/ui/src/motion/tokens.ts`, `variants.ts`). Every `RevealSection` user gets this, not only the homepage.
- Programmatic scroll: call `scrollIntoViewBehavior()` (`packages/ui/src/lib/prefers-reduced-motion.ts:27`), never a literal `'smooth'`. Used at `packages/ui/src/rich-text-editor/tiptap/rich-text-editor.tsx:1504` and `packages/ui/src/rich-text-editor/tiptap/extensions/search-and-replace.tsx:210`.
- Public page frame: `ShellBase` (`packages/ui/src/shell.tsx:7`) owns the top/bottom padding and block gap; a page passes only its max-width (AGENTS §14).
- Styling and build: apps/web scans `packages/ui/src/**` (`apps/web/tailwind.config.ts:8`) and transpiles the package (`apps/web/next.config.js`, `transpilePackages`).

## Recipes

1. **Add a primitive.** Create `packages/ui/src/<name>.tsx` (add `'use client'` only if it has state, effects, handlers or a browser API). Add `export * from './<name>';` to `packages/ui/src/index.ts`. Consumers import `@byte-of-me/ui/<name>` through the `./*` export. Examples: `packages/ui/src/shell.tsx` (server-safe), `packages/ui/src/copy-button.tsx` (client, uses `m.*`).
2. **Add a hook.** Create `packages/ui/src/hooks/use-<name>.ts` and add `export * from './use-<name>';` to `packages/ui/src/hooks/index.ts`. Consumers import `@byte-of-me/ui/hooks/use-<name>` (`./hooks/*` export). Example: `packages/ui/src/hooks/use-lock-body.ts`, imported at `apps/web/src/widgets/public/public-site-header/ui/public-header-mobile-nav.tsx:7`.
3. **Add an editor node.** (a) Define it in `packages/ui/src/rich-text-editor/tiptap/extensions/`. (b) Register it in `createExtensions()` (`rich-text-editor.tsx:95`). (c) Add a render-side twin with the same name and attributes to `renderExtensions` (`render-extensions.ts:263`). (d) Optional toolbar: `toolbars/<name>.tsx` plus a line in `toolbars/editor-toolbar.tsx`. Example: `Citation` (`extensions/references/citation.ts`) → `CitationBase` (`citation-base.ts`) → `toolbars/citation.tsx`.

## Gotchas

- The root barrel is TipTap-free: the static closure of `packages/ui/src/index.ts` is 61 files with no `@tiptap`, KaTeX or Mermaid import. AGENTS §7 and `apps/web/src/features/public/blog-print/ui/blog-print-trigger.tsx:3-5` say otherwise. Keep `rich-text*` and the editor out of `index.ts` (`index.ts:38-46`).
- `./*` maps top-level `.tsx` only; a `.ts` module needs its own `exports` entry. `lib/tiptap-utils.ts` has none; only editor-internal files import it. `@byte-of-me/ui/hooks` (no file) does not resolve.
- `RichText` has no `'use client'` on purpose. Imported from client code it ships the whole render schema (`rich-text.tsx:1-16`). Hand HTML to `RichTextHtml` instead.
- Editor and render schemas must mirror each other. A node the editor can store but `renderExtensions` lacks makes `generateHTML` throw, and the document prints as escaped plain text (`rich-text-render.ts:20-33,55-57`; invariant at `render-extensions.ts:11-13`).
- `m.*` animates only under `MotionProvider`, which loads the features (`motion-provider.tsx:9-10,21`). `MotionConfig` does not cover raw CSS (AGENTS §14).
- Classes used only in `packages/ui` are generated because of the `apps/web/tailwind.config.ts:8` content glob. Do not narrow that glob.
- Run tests from this directory. `bunfig.toml` resolves its preload against cwd, so `bun test packages/ui` from the root skips `happydom.ts` (AGENTS §10). `@happy-dom/global-registrator` and `@testing-library/react` are declared only in the root `package.json`.
- `packages/ui/README.md` is stale. Its "Known flagged code" paths (`src/rich-text-editor/blocks/**`, `src/rich-text-editor/editor/**`) and `lexical` deps do not exist. No file in `packages/ui/src` imports `next-intl`, so `expandable-text` does not translate. `filter-multi-select-section` does not exist. `apps/web/src/shared/lib` re-exports `cn` but not `sanitizeHtml`. "Every module is reachable by subpath" is wrong (see the second bullet).

## Run

From the repo root (script names from `packages/ui/package.json`):

```
bun run --filter '@byte-of-me/ui' test            # bun test, cwd = packages/ui (preload applies)
bun run --filter '@byte-of-me/ui' check-types     # tsc --noEmit
bun run --filter '@byte-of-me/ui' lint            # eslint src (lint:fix autofixes)
cd packages/ui && bun test src/lib/utils.spec.ts  # one spec file, from this directory
```

- Preload: `packages/ui/bunfig.toml` → `packages/ui/happydom.ts`. 20 spec files; DOM rendering uses `*.spec.tsx` with `@testing-library/react`.

## AGENTS.md deviations

- §7 (apps/web imports of `@byte-of-me/ui`): no real violation. The static closure of 143 client entries reaches no `rich-text*`, TipTap, KaTeX or Mermaid module. The only editor path is the dashboard-only `apps/web/src/shared/ui/lazy-rich-text-editor.tsx:16`. 92 client files import the root barrel, which carries no TipTap.
- `packages/ui/src/dialog.tsx:24`, `alert-dialog.tsx:21`, `sheet.tsx:24`, `drawer.tsx:31`: §14, hardcoded `bg-black/80` scrim.
- `packages/ui/src/rich-text-editor/tiptap/extensions/image.tsx:196-197`: §14, `bg-black/40` and `text-white` on the upload overlay.
- `packages/ui/src/rich-text-editor/tiptap/toolbars/color-and-highlight.tsx:174`: §14, `dark:bg-gray-2`.
- `packages/ui/src/rich-text-editor/tiptap/toolbars/link.tsx:93-94`: §14, text arrow `↗` used as an icon (Lucide only) and a `decoration-gray-7` class.
- `packages/ui/src/icons.tsx:1,145-146`: §14, react-icons (`PiHandsClapping`) used for a non-brand glyph (`apps/web/src/features/public/toggle-blog-interactions/ui/clap-button.tsx:150`).
- `packages/ui/src/loading.tsx:1`: §9, `'use client'` on a pure SVG spinner with no state, effects, handlers or browser APIs.
- `packages/ui/src/rich-text-editor/tiptap/rich-text-editor.tsx`: §9, 1,547 lines against the ~300-line component threshold; extract hooks.
- `packages/ui/src/rich-text-editor/tiptap/toolbars/citation.tsx:80,91,101`, `toolbars/search-and-replace-toolbar.tsx:109`, `extensions/image.tsx:301`: §4, English UI strings hardcoded; the editor has no label props (unlike `pagination.tsx`).
- `packages/ui/src/lib/rich-text-content.ts:3-20`, `packages/ui/src/shell.tsx:10-22`: §11.14, comment blocks over three lines (about 169 of 549 blocks, line-count heuristic).
- `apps/web/src/features/public/blog-print/ui/blog-print-trigger.tsx:3-5`: §11.11, stale comment; it says the barrel reaches TipTap, and it does not.

## See also

- [web-shared.md](./web-shared.md): `shared/ui/lazy-rich-text-editor`, `shared/lib/utils`.
- [web-entities-content.md](./web-entities-content.md): rich-text consumers (blog, project, education, featured work).
- [web-widgets.md](./web-widgets.md): public header motion and hook consumers.
- [web-features.md](./web-features.md): blog print and reaction UI.
- [tooling-and-small-packages.md](./tooling-and-small-packages.md): turbo, test and lint wiring.
- [../architecture.md](../architecture.md), [../README.md](../README.md).
