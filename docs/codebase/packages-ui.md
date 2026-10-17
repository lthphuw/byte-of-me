# packages/ui (`@byte-of-me/ui`)

> Shared UI package: the TipTap rich-text editor and renderer, the form controls and the carousel, and a root barrel over the leaf packages it builds on: `ui-utils` (`cn`, link and scroll helpers), `ui-hooks` and `ui-motion` (layer 0), `ui-primitives` (the Radix wrappers and composites) and `ui-toast` (the `Toaster`) (layer 1). Source: `packages/ui/src/`, `packages/ui/package.json`, `packages/ui/bunfig.toml`, `packages/{ui-utils,ui-hooks,ui-motion,ui-primitives,ui-toast}/`, `packages/config/test/happydom.ts`.

## Layout

```
packages/ui/
├── package.json             exports map = the public surface (table below)
├── bunfig.toml              [test] preload = ["../config/test/happydom.ts"]: DOM for *.spec.tsx; sets IS_REACT_ACT_ENVIRONMENT
└── src/
    ├── index.ts             root barrel; omits rich-text*, rich-text-editor, mermaid, math
    ├── <name>.tsx           the form controls (form, calendar, date-picker, command, multi-select), carousel and drawer
    ├── rich-text.tsx        RichText: server component, stored Tiptap JSON -> HTML
    ├── rich-text-html.tsx   RichTextHtml: client-safe printer of already-sanitised HTML
    ├── rich-text-render.ts  renderRichTextHtml, renderRichTextDocumentHtml: server only
    ├── mermaid-blocks.tsx   MermaidBlocks: client; swaps mermaid blocks for SVG (lazy import); reserves a box of the stored size first
    ├── mermaid-size.ts      svgNaturalSize / parseMermaidSize: a diagram's WxH, the `data-mermaid-size` attribute
    ├── math-renderer.tsx    MathRenderer: client; KaTeX over data-latex placeholders
    ├── hooks/               use-embla-state, the one hook left here (the carousel's); the rest are in `ui-hooks`
    ├── lib/                 sanitize, rich-text-content codec, image-ratios
    └── rich-text-editor/tiptap/
        ├── rich-text-editor.tsx   RichTextEditor: the frame, the toolbar, the writing column and the outline aside
        ├── create-extensions.ts   createExtensions(): the editor schema and behaviour
        ├── use-debounced-change.ts, use-outline.ts, outline-aside.tsx   onChange coalescing and the submit flush; the heading outline and the active heading
        ├── render-extensions.ts   renderExtensions: server-safe mirror of the editor schema
        ├── extensions/            node/mark definitions; references/ = citations and bibliography
        ├── toolbars/              ToolbarButton + basic-toolbars.tsx (the one-command buttons, from a factory); one file per menu or popover control; editor-toolbar.tsx registers them
        ├── mobile-tools.tsx, editor-preview.tsx, paste-presentation.ts, paste-markdown.ts
        └── editor-surface.css     editor and article styles (imported by the editor)
```

### Leaf packages (layers 0 and 1)

`packages/ui` imports these by package name; none imports `@byte-of-me/ui`. Each ships TypeScript source, has one `exports` entry (`.`) and `"sideEffects": false`.

| Package | Root exports | Dependencies |
| --- | --- | --- |
| `@byte-of-me/ui-utils` (`packages/ui-utils/src/`) | `cn` (`utils.ts`); `SAFE_SCHEMES`, `schemeOf`, `normalizeLinkInput` (`url.ts`); `scrollIntoViewBehavior` (`prefers-reduced-motion.ts`); `PixelSize`, `isPixelSize` (`pixel-size.ts`) | `clsx`, `tailwind-merge`. In `noReact`: no `react` import. |
| `@byte-of-me/ui-hooks` (`packages/ui-hooks/src/`) | `useAutoGrow`, `useClipboard`, `useDebounce`, `useIntersection`, `useLockBody`, `useMediaQuery` | `react`, `react-dom` peers |
| `@byte-of-me/ui-motion` (`packages/ui-motion/src/`) | `MotionProvider`; `tokens.ts`, `transitions.ts`, `variants.ts` | `framer-motion`, `react` peers |
| `@byte-of-me/ui-primitives` (layer 1; `packages/ui-primitives/src/`) | Radix wrappers and plain elements: `alert-dialog`, `avatar`, `badge`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `empty`, `input`, `label`, `loading`, `popover`, `scroll-area`, `select`, `separator`, `sheet`, `skeleton`, `switch`, `tabs`, `textarea`, `tooltip`. Composites: `auto-growing-textarea`, `confirm-dialog`, `copy-button`, `delete-button`, `editor-skeleton`, `icons` (`Icons` map: the Lucide glyphs the app uses, an inlined clap, and the brand marks), `pagination`. `lib/surface-classes` (scrim, modal, popup and menu class strings the overlay and menu components share, and that `drawer` and `command` in `packages/ui` reuse). `modal-close.tsx`, the corner X of dialog and sheet (accessible name as `label`), is internal and not exported | the 15 `@radix-ui/*` packages it wraps, `class-variance-authority`, `lucide-react`, `ui-hooks`, `ui-motion`, `ui-utils`; `react`, `react-dom`, `framer-motion` peers |
| `@byte-of-me/ui-toast` (layer 1; `packages/ui-toast/src/`) | `Toaster` (`sonner.tsx`) | `sonner`, `next-themes`, `react` peers |

`apps/web` imports them directly (`@byte-of-me/ui-utils` in `shared/lib/utils.ts` and the three blog reader files, `ui-hooks` in the mobile nav and the featured-work demo, `ui-motion` in the header, `ui-primitives` in the header account panel, the print trigger and `LazyRichTextEditor`). `@byte-of-me/ui` re-exports `ui-hooks`, `ui-motion`, `ui-primitives` and `ui-toast` from its root, so the root-barrel imports in `apps/web` are unchanged (the app's `<Toaster>` still comes from there); it does not re-export `ui-utils`, and `cn` has no root-barrel consumer.

**One `sonner`.** `ui-toast` declares `sonner` and `next-themes` as peers; `packages/ui` keeps its own `sonner` dependency because the editor calls `toast()`, and `apps/web` calls it everywhere. All three take the root catalog entry, so the install holds one copy (`ls node_modules/.bun | rg '^sonner@'` lists one directory) and a toast raised from the editor reaches the app's `<Toaster>`.

### Subpath exports

| Import path | Use it when | Why (AGENTS §7) |
| --- | --- | --- |
| `@byte-of-me/ui` | server code, or a non-public client file, needs several primitives | barrel: a readability concern, not a bundle one; TipTap-free (Gotchas 1) |
| `@byte-of-me/ui-utils` | you need `cn()`, `scrollIntoViewBehavior` or the link helpers | a leaf package, not a `ui` subpath; no React, safe anywhere (and the only way `shared/lib/utils.ts` may take `cn`) |
| `@byte-of-me/ui/lib/sanitize` | escaping or sanitising HTML in server code | listed in §7; pure |
| `@byte-of-me/ui/lib/rich-text-content` | parsing or blank-checking a stored rich-text column | type-only TipTap import; safe anywhere |
| `@byte-of-me/ui/rich-text-editor` | a dashboard form edits rich text (reach it via `LazyRichTextEditor`); exports `RichTextEditor`, `EditorLabels` and `RichTextChangeMeta` and nothing else | listed in §7: the whole editor must stay off public pages |
| `@byte-of-me/ui/rich-text` | a server component renders stored rich text | listed in §7: load-bearing boundary; server-only schema |
| `@byte-of-me/ui/rich-text-html` | a client component prints HTML a server already rendered | presentational; no TipTap |
| `@byte-of-me/ui/rich-text-render` | a server action or loader returns sanitised HTML | server only (`generateHTML`) |
| `@byte-of-me/ui/mermaid-blocks`, `@byte-of-me/ui/math-renderer` | an article body has mermaid blocks or math | client leaves; not barrel-exported |
| `@byte-of-me/ui-motion` | public UI needs `MotionProvider`, tokens or variants | a leaf package; `m.*` features load lazily |
| `@byte-of-me/ui-primitives` | a button, dialog, input, tabs or another primitive in a client entry; `EditorSkeleton` | a leaf package; TipTap-free, so the root of the package is safe on any page |
| `@byte-of-me/ui-toast` | the `Toaster` | a leaf package; `sonner` and `next-themes` are peers |
| `@byte-of-me/ui-hooks` | one of the hooks above | a leaf package; the root of the package is the only path |
| `@byte-of-me/ui/<name>` | one top-level `.tsx` module that is left here (`form`, `command`) | `./*` wildcard; leaf import |

### Rich-text extension sets

- Editor: `createExtensions()` (`packages/ui/src/rich-text-editor/tiptap/create-extensions.ts`), called inside a `useMemo` in `RichTextEditor`. StarterKit (heading, codeBlock, link, underline off), CodeBlockLowlight, CustomHeading, Placeholder, TextAlign, TextStyle, Sub/Superscript, Underline, Link, Color, Highlight (multicolor), Image, ImageGroup, ImagePlaceholder, SearchAndReplace, Typography, TableKit (not resizable), NumericTableColumns, TableHeaderScopes, Markdown, Citation, ReferenceList, ClipboardImport. Image, ImageGroup, ImagePlaceholder, Citation and ReferenceList are configured with `labels`, so their node views draw the app's text.
- Conditional: TableOfContents unless `compact` (`useOutline`). `ClipboardImport` (`extensions/clipboard-import.ts`, priority 1000) owns paste and drop: it strips pasted presentation, uploads a dropped or pasted image file, and turns pasted Markdown source into blocks except in a code block.
- Render: `renderExtensions` (`packages/ui/src/rich-text-editor/tiptap/render-extensions.ts`). Both lists start from `sharedExtensions` (StarterKit, code blocks, headings, text marks, link, colour, highlight), and `schema-parity.spec.ts` checks that every node, mark and attribute the editor stores is drawn by the render schema. The rest are the same node and mark names via `*Base` / `Render*` / `ScopedTable` variants. No Placeholder, SearchAndReplace, Markdown, TableOfContents, ClipboardImport or node views. Math nodes (`inlineMath`, `blockMath`) render for stored documents; the editor itself no longer authors them (no consumer passed `withMath` after the notes workspace was removed).

### Flat files

- Wrappers over a third-party lib: calendar (react-day-picker), carousel (embla), command (cmdk), drawer (vaul), form (react-hook-form).
- Composites: date-picker, multi-select.
- The Radix wrappers, the other composites and the `Toaster` are in `ui-primitives` and `ui-toast` (table above). `ShellBase` is `apps/web/src/shared/ui/shell.tsx`.

## Key flows

- Public rich text: `RichText` (`packages/ui/src/rich-text.tsx:16`) → `renderRichTextHtml` (`packages/ui/src/rich-text-render.ts:50`) → `generateHTML(…, renderExtensions)` after citation numbering and numeric-column marking (`rich-text-render.ts:26-29`) → `sanitizeHtml` (`packages/ui/src/lib/sanitize.ts:196`) → `RichTextHtml` (`packages/ui/src/rich-text-html.tsx:48`). `sanitizeHtml` rewrites an `href`/`src` outside `SAFE_SCHEMES` to `#`; it decodes character references once, with any number of leading zeros, and treats a reference it cannot resolve before the first colon as unsafe. It reads a quoted attribute value whole, so a `>` inside an image `alt` stays in the value, and writes `<` and `>` in a kept value as entities; a `<` that opens no complete tag becomes `&lt;`. The full variant reserves `aspect-[auto_16/9]` on the muted surface for every body `<img>` (`rich-text-html.tsx`, the "Images / media" class group). A blog post also passes `imageSizes` to `RichText`: `renderRichTextHtml` writes each image's stored size as an inline `aspect-ratio` after sanitizing (`lib/image-ratios.ts`, `withImageRatios`), so the box is exact before the file draws. An image with no media row keeps the 16:9 box. Mermaid code blocks carry `data-mermaid-size="WxH"`, written by the editor's `MermaidSize` extension (`rich-text-editor/tiptap/extensions/mermaid-size.ts`) once a diagram's text changes while the editor is focused, and kept by `sanitizeHtml` only when it matches `PATTERN_ATTRS`. Blocks saved before that carry no size and still swap in unreserved; they gain one the next time their author edits the diagram.
- Client needing rendered rich text: a server action returns `renderRichTextHtml` output; the client prints it with `RichTextHtml` (e.g. `apps/web/src/entities/project/ui/project-timeline-item.tsx:6`).
- Dashboard editing: `LazyRichTextEditor` (`apps/web/src/shared/ui/lazy-rich-text-editor.tsx:19`, `ssr: false`) → `RichTextEditor` (`packages/ui/src/rich-text-editor/tiptap/rich-text-editor.tsx`; required props `uploadFailedText`, the upload-failure text, and `labels`, an `EditorLabels` (`packages/ui/src/rich-text-editor/tiptap/editor-labels.ts`) holding every other line of text the editor draws). `LazyRichTextEditor` supplies `labels` itself, built once per locale in `apps/web/src/shared/hooks/use-editor-labels.ts` from `dashboard.media.editor`, so a form passes none; Upload, Delete and Cancel reuse `dashboard.media.picker.uploadButton` and `dashboard.shared.confirmDelete`. Forms seed with `toEditorContent` and save `fromEditorContent(json)` (`apps/web/src/widgets/dashboard/project-manager/ui/project-form.tsx`, the editor field).
- Stored value parsing: `parseRichTextContent` accepts any object; legacy plain text passes through and becomes a paragraph (`packages/ui/src/lib/rich-text-content.ts:23,44`).
- Motion: `MotionProvider` (`packages/ui-motion/src/motion-provider.tsx:17`) is mounted at the app root (`apps/web/src/app/providers/global-provider.tsx:24`). It lazy-loads `domAnimation` (`motion-provider.tsx:9-10`) and sets `reducedMotion="user"` (`:20`).
- Scroll reveal: `fadeUp` starts at `motionOpacity.placeholder` (0.2), not 0, so a block below the fold holds its space as a faded placeholder until it reveals (`packages/ui-motion/src/tokens.ts`, `variants.ts`). Every `RevealSection` user gets this, not only the homepage. `RevealSection` takes only `id`, `className` and `immediate`; it reveals once, as a `div`.
- Programmatic scroll: call `scrollIntoViewBehavior()` (`packages/ui-utils/src/prefers-reduced-motion.ts:16`, imported from `@byte-of-me/ui-utils`), never a literal `'smooth'`. Used at `packages/ui/src/rich-text-editor/tiptap/outline-aside.tsx` and `packages/ui/src/rich-text-editor/tiptap/extensions/search-and-replace.tsx`.
- Public page frame: `ShellBase` (`apps/web/src/shared/ui/shell.tsx:7`, imported by the five `<page>-shell.tsx` widgets) owns the top/bottom padding and block gap; a page passes only its max-width (AGENTS §14).
- Styling and build: apps/web scans `packages/*/src/**` (`apps/web/tailwind.config.ts:8`) and transpiles the package (`transpilePackages` in `apps/web/next.config.js` lists every workspace package). Dependencies: this package declares the TipTap, KaTeX, Mermaid, embla, cmdk, vaul, react-hook-form, react-day-picker, sonner, highlight.js, `lucide-react` and Radix (slot, label, popover) libraries it still imports; the other Radix packages, `class-variance-authority` and `framer-motion` went with `ui-primitives`, `next-themes` with `ui-toast`. `apps/web` declares only what its own source imports (it no longer lists the UI-only ones). Versions shared by both packages live in the root `workspaces.catalog`, and every dependency here that has a catalog entry uses `catalog:`.

## Recipes

1. **Add a primitive.** Create `packages/ui-primitives/src/<name>.tsx` (add `'use client'` only if it has state, effects, handlers or a browser API) and add `export * from './<name>';` to `packages/ui-primitives/src/index.ts`, in alphabetical order. It may import only Radix, `class-variance-authority`, `lucide-react`, `framer-motion` and the layer-0 packages; a control that needs react-hook-form, cmdk, embla or TipTap goes in a higher layer. `@byte-of-me/ui` re-exports it through `export * from '@byte-of-me/ui-primitives'`, and `apps/web` imports either. Examples: `packages/ui-primitives/src/card.tsx` (server-safe), `packages/ui-primitives/src/copy-button.tsx` (client, uses `m.*`).
2. **Add a hook.** Create `packages/ui-hooks/src/use-<name>.ts` and add `export * from './use-<name>';` to `packages/ui-hooks/src/index.ts`. The root barrel of `@byte-of-me/ui` re-exports it through `export * from '@byte-of-me/ui-hooks'`; `apps/web` imports `@byte-of-me/ui-hooks`. Example: `packages/ui-hooks/src/use-lock-body.ts`, imported at `apps/web/src/widgets/public/public-site-header/ui/public-header-mobile-nav.tsx:5`.
3. **Add an editor node.** (a) Define it in `packages/ui/src/rich-text-editor/tiptap/extensions/`. (b) Register it in `createExtensions()` (`create-extensions.ts`). If its node view draws text, give it a `labels` option and add the keys to `editor-labels.ts`, `editor-labels.test-fixture.ts` and `apps/web/src/shared/hooks/use-editor-labels.ts`, then both catalogues. (c) Add a render-side twin with the same name and attributes to `renderExtensions` (`render-extensions.ts`). (d) Optional toolbar: a command button is one `createToolbarButton` spec in `toolbars/basic-toolbars.tsx`; a control with a menu or popover gets its own `toolbars/<name>.tsx`; either way a line in `toolbars/editor-toolbar.tsx`. Example: `Citation` (`extensions/references/citation.ts`) → `CitationBase` (`citation-base.ts`) → `toolbars/citation.tsx`.

## Gotchas

- The root barrel is TipTap-free: the static closure of `packages/ui/src/index.ts` is 64 files (11 in `packages/ui/src`, 33 in `ui-primitives`, 2 in `ui-toast`, 7 in `ui-hooks`, 6 in `ui-motion`, 5 in `ui-utils`; measured 2026-10-17) and its only TipTap import is the type-only `@tiptap/core` one in `lib/rich-text-content.ts`; no KaTeX or Mermaid. AGENTS §7 says otherwise. Keep `rich-text*` and the editor out of `index.ts` (`index.ts:15-17`). A package never imports `@byte-of-me/ui` and the facade is never re-exported into a package: the init-order cycle that would create fails `/api/og` and only `bun run build` shows it.
- `./*` maps top-level `.tsx` only; a `.ts` module needs its own `exports` entry. `lib/tiptap-utils.ts` has none; only editor-internal files import it. The old `@byte-of-me/ui/hooks/*`, `/motion`, `/lib/utils` and `/lib/prefers-reduced-motion` subpaths are gone, and so are `/button`, `/skeleton`, `/editor-skeleton` and the rest of the moved primitives; use the leaf packages.
- `RichText` has no `'use client'` on purpose. Imported from client code it ships the whole render schema (`rich-text.tsx:1-16`). Hand HTML to `RichTextHtml` instead.
- Editor and render schemas must mirror each other. A node the editor can store but `renderExtensions` lacks makes `generateHTML` throw, and the document prints as escaped plain text (`rich-text-render.ts:20-33,55-57`; invariant at `render-extensions.ts:11-13`).
- `m.*` animates only under `MotionProvider`, which loads the features (`packages/ui-motion/src/motion-provider.tsx:9-10,19`). `MotionConfig` does not cover raw CSS (AGENTS §14).
- Classes used only in a package are generated because of the `apps/web/tailwind.config.ts:8` content glob, `../../packages/*/src/**/*.{ts,tsx}` Do not narrow that glob.
- Run tests from the package directory. `bunfig.toml` resolves its preload against cwd, so `bun test packages/ui` from the root skips the happy-dom preload (AGENTS §10). `@happy-dom/global-registrator` and `@testing-library/react` are declared only in the root `package.json`. `ui-hooks` and `ui-primitives` have the same `bunfig.toml`; `ui-utils` and `ui-motion` have pure specs and none, and `ui-toast` has no specs and no `test` script.
- `Button` owns the touch floor at every size: `min-h-11` on touch, and under `can-hover:` `min-h-9` (default, icon), `min-h-8` (sm) or `min-h-10` (lg), plus `min-w-11` / `can-hover:min-w-9` on `icon`. A call site writes its own `min-h-*` only to ask for a different pointer height (the `size="sm"` buttons across the dashboard ask for 36 px). `aria-disabled` dims and blocks the pointer like `disabled`, so a control kept focusable that way needs no class of its own. `Input` and `SelectTrigger` carry the same floor (36 px under `can-hover:`). `TabsTrigger` keeps it as an invisible `before:` hit area (measured 44 px) around a 32 px pill (28 px under `can-hover:`): a 44 px pill around 14 px text read as oversized. `Input`, `Textarea`, `SelectTrigger` and `Checkbox` draw `aria-invalid="true"` as a `--destructive-text` edge and ring (`FormControl` sets the attribute); the message text beside the field is the non-colour cue. `Checkbox`'s edge is `--input`, filling with `--primary` only when checked.
- `Badge` is a static label: no hover, no focus ring. With `asChild` it styles a `<button>` or `<a>` as interactive (`badgeVariants({ interactive: true })` does the same for a bare element). `TagClickableBadge` and `TechStackClickableBadge` (`apps/web/src/entities/{tag,tech-stack}/ui/`) render a `<button aria-pressed>` when given `onClick` and plain text when not; they were a `div` with `onClick`, which a keyboard could not reach.
- `DeleteButton` (`packages/ui-primitives/src/delete-button.tsx`) is `size="icon"`: 44 px on touch, 36 px with a mouse, and takes no size prop. It has three consumers, all dashboard surfaces (`rg -n "DeleteButton" apps packages`). Its `DeleteButtonProps` type is not exported. `EditButton` was deleted: it had no importer.
- `Calendar` is a thin react-day-picker wrapper for the single-date `DatePicker`: 44 px cells on touch (`--cell-size`), 32 px with a pointer, no range, week-number or dropdown-caption styling. `Carousel` is horizontal only; `CarouselPrevious` and `CarouselNext` take their accessible name as `label`, and arrow keys typed into an input, a `<video>` or another handled event are left to it. `useEmblaState(api)` is the one subscription to Embla's selected slide and scroll limits, shared by `Carousel` and the app's `MediaCarousel`. `Pagination` is a `<nav>` named by `pageLabel`, and all three labels are required.
- Hooks: `useDebounce(value, wait)` returns the debounced value. `useClipboard({ timeout })` returns `{ copy, copied }`; `copy` resolves to whether the browser took the text (it refuses outside a secure context or when permission is denied), so a caller can say so. `useIntersection` compares `threshold` by value, so a literal array in the caller does not re-observe on every render.
- `MotionProvider` mounts `LazyMotion` with `strict`: a `motion.*` element throws instead of loading the full feature set, which is how AGENTS §14 (`m.*` only) is enforced. `AutoGrowingTextarea` sizes itself with `useAutoGrow` and scrolls past `max-h-[200px]`.
- The editor is a field: its frame takes `border-input` and a focus ring, and until `useEditor` has built the editor (and, in the app, until the chunk has loaded) it draws `EditorSkeleton` (`packages/ui-primitives/src/editor-skeleton.tsx`, imported from `@byte-of-me/ui-primitives`; `rich-text-editor-loading.spec.tsx` checks the editor draws it) at the size it will take. `LazyRichTextEditor` passes `compact` and `minHeight` to that skeleton through a context, because `next/dynamic` gives its loading component no props. Call sites put `FormControl` directly around the editor and add no frame of their own.
- Links: `packages/ui-utils/src/url.ts` holds `SAFE_SCHEMES` (http, https, mailto, tel), read by the sanitizer, the BibTeX import and the link control; `normalizeLinkInput` turns what an author typed into an address to store (a safe scheme, a path or fragment as typed, a bare domain gets `https://`, anything else is refused). The link and reference fields ignore the Enter that commits an IME composition.
- Search and replace (`extensions/search-and-replace.ts`): the term is literal, the selected match is always in range, and Replace acts on the selected match; matches are drawn by the `search-result` classes in `editor-surface.css`, the selected one with a ring as well as a fill. An image with no uploader to take it is removed with the upload-failed message instead of keeping an address only the author's tab can read.
- `ConfirmDialog`: `title`, `description`, `confirmLabel` and `cancelLabel` are required; this package has no next-intl context, so it ships no English default. `destructive` gives the confirm button the destructive style (a delete); without it the button is primary. Confirming never closes it: the caller does, so the dialog can stay open while the action runs. While `isLoading` it ignores Escape and a scrim tap and disables both buttons. The app uses it through `ConfirmDeleteDialog` and `ConfirmDiscardDialog` (`apps/web/src/shared/ui`), which supply the labels; the editor's reference panel uses it directly.
- `DatePicker` (`placeholder`, `formatDate`, optional `calendarLocale`), `MultiSelect` (`placeholder`, `searchPlaceholder`, `emptyLabel`, `removeLabel`) and `CopyButton` (`label`, `copiedLabel`) take every visible or announced string as a prop. The app calls the `Localized*` wrappers in `apps/web/src/shared/ui/localized-controls.tsx` for the first two (`components.datePicker`, `components.multiSelect`); `MediaCard`, an entity, takes `copyLabel` and `copiedLabel` from `MediaLibrary` (`components.copyButton`). `MultiSelect` keeps its chips beside the combobox button, not inside it, so no button nests in another.

## Run

From the repo root (script names from `packages/ui/package.json`):

```
bun run --filter '@byte-of-me/ui' test            # bun test, cwd = packages/ui (preload applies)
bun run --filter '@byte-of-me/ui-primitives' test # the primitives' specs, cwd = packages/ui-primitives
bun run --filter '@byte-of-me/ui' check-types     # tsc --noEmit
bun run --filter '@byte-of-me/ui' lint            # eslint src (lint:fix autofixes)
cd packages/ui-utils && bun test src/utils.spec.ts  # one spec file, from its package directory
```

- Preload: `packages/ui/bunfig.toml`, `packages/ui-hooks/bunfig.toml` and `packages/ui-primitives/bunfig.toml` → `packages/config/test/happydom.ts`, shared with `apps/web`. Measured 2026-10-17: `ui` 29 spec files (302 tests), `ui-primitives` 6 (21), `ui-hooks` 4 (14), `ui-utils` 2 (13), `ui-motion` 1 (5), 355 in all; DOM rendering uses `*.spec.tsx` with `@testing-library/react`. The leaf packages run the same way: `bun run --filter '@byte-of-me/ui-hooks' test`.

## AGENTS.md deviations

- §7 (apps/web imports of `@byte-of-me/ui`): no real violation. The static closure of 143 client entries reaches no `rich-text*`, TipTap, KaTeX or Mermaid module. The only editor path is the dashboard-only `apps/web/src/shared/ui/lazy-rich-text-editor.tsx:19`. 92 client files import the root barrel, which carries no TipTap.
- `packages/ui/src/lib/rich-text-content.ts:3-20`: §11.14, a comment block over three lines (about 169 of 549 blocks, line-count heuristic).

## See also

- [web-shared.md](./web-shared.md): `shared/ui/lazy-rich-text-editor`, `shared/lib/utils`.
- [web-entities-content.md](./web-entities-content.md): rich-text consumers (blog, project, education, featured work).
- [web-widgets.md](./web-widgets.md): public header motion and hook consumers.
- [web-features.md](./web-features.md): blog print and reaction UI.
- [tooling-and-small-packages.md](./tooling-and-small-packages.md): turbo, test and lint wiring.
- [../architecture.md](../architecture.md), [../README.md](../README.md).
