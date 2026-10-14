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
    ├── modal-close.tsx      ModalClose: the corner X of dialog and sheet; takes the accessible name as `label`
    ├── rich-text.tsx        RichText: server component, stored Tiptap JSON -> HTML
    ├── rich-text-html.tsx   RichTextHtml: client-safe printer of already-sanitised HTML
    ├── rich-text-render.ts  renderRichTextHtml, renderRichTextDocumentHtml: server only
    ├── mermaid-blocks.tsx   MermaidBlocks: client; swaps mermaid blocks for SVG (lazy import); reserves a box of the stored size first
    ├── mermaid-size.ts      svgNaturalSize / parseMermaidSize: a diagram's WxH, the `data-mermaid-size` attribute
    ├── math-renderer.tsx    MathRenderer: client; KaTeX over data-latex placeholders
    ├── hooks/               use-auto-grow, use-clipboard, use-debounce, use-embla-state, use-intersection, use-lock-body, use-media-query
    ├── lib/                 cn, sanitize, rich-text-content codec, reduced-motion, surface-classes (scrim, modal, popup and menu class strings shared by the overlay and menu primitives)
    ├── motion/              MotionProvider (LazyMotion + reducedMotion), tokens, variants, transitions
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

### Subpath exports

| Import path | Use it when | Why (AGENTS §7) |
| --- | --- | --- |
| `@byte-of-me/ui` | server code, or a non-public client file, needs several primitives | barrel: a readability concern, not a bundle one; TipTap-free (Gotchas 1) |
| `@byte-of-me/ui/lib/utils` | you need `cn()` | not a §7 subpath; pure, safe anywhere |
| `@byte-of-me/ui/lib/sanitize` | escaping or sanitising HTML in server code | listed in §7; pure |
| `@byte-of-me/ui/lib/rich-text-content` | parsing or blank-checking a stored rich-text column | type-only TipTap import; safe anywhere |
| `@byte-of-me/ui/lib/prefers-reduced-motion` | any programmatic scroll (`scrollIntoViewBehavior`) | §14: CSS cannot cover a literal `behavior: 'smooth'` |
| `@byte-of-me/ui/rich-text-editor` | a dashboard form edits rich text (reach it via `LazyRichTextEditor`); exports `RichTextEditor`, `EditorLabels` and `RichTextChangeMeta` and nothing else | listed in §7: the whole editor must stay off public pages |
| `@byte-of-me/ui/rich-text` | a server component renders stored rich text | listed in §7: load-bearing boundary; server-only schema |
| `@byte-of-me/ui/rich-text-html` | a client component prints HTML a server already rendered | presentational; no TipTap |
| `@byte-of-me/ui/rich-text-render` | a server action or loader returns sanitised HTML | server only (`generateHTML`) |
| `@byte-of-me/ui/mermaid-blocks`, `@byte-of-me/ui/math-renderer` | an article body has mermaid blocks or math | client leaves; not barrel-exported |
| `@byte-of-me/ui/motion` | public UI needs `MotionProvider`, tokens or variants | listed in §7; `m.*` features load lazily |
| `@byte-of-me/ui/hooks/<name>` | one hook | listed in §7 (`./hooks/*`); import the file, not an index |
| `@byte-of-me/ui/<name>` | one top-level `.tsx` primitive (`button`, `shell`) | `./*` wildcard; leaf import |

### Rich-text extension sets

- Editor: `createExtensions()` (`packages/ui/src/rich-text-editor/tiptap/create-extensions.ts`), called inside a `useMemo` in `RichTextEditor`. StarterKit (heading, codeBlock, link, underline off), CodeBlockLowlight, CustomHeading, Placeholder, TextAlign, TextStyle, Sub/Superscript, Underline, Link, Color, Highlight (multicolor), Image, ImageGroup, ImagePlaceholder, SearchAndReplace, Typography, TableKit (not resizable), NumericTableColumns, TableHeaderScopes, Markdown, Citation, ReferenceList, ClipboardImport. Image, ImageGroup, ImagePlaceholder, Citation and ReferenceList are configured with `labels`, so their node views draw the app's text.
- Conditional: TableOfContents unless `compact` (`useOutline`). `ClipboardImport` (`extensions/clipboard-import.ts`, priority 1000) owns paste and drop: it strips pasted presentation, uploads a dropped or pasted image file, and turns pasted Markdown source into blocks except in a code block.
- Render: `renderExtensions` (`packages/ui/src/rich-text-editor/tiptap/render-extensions.ts`). Both lists start from `sharedExtensions` (StarterKit, code blocks, headings, text marks, link, colour, highlight), and `schema-parity.spec.ts` checks that every node, mark and attribute the editor stores is drawn by the render schema. The rest are the same node and mark names via `*Base` / `Render*` / `ScopedTable` variants. No Placeholder, SearchAndReplace, Markdown, TableOfContents, ClipboardImport or node views. Math nodes (`inlineMath`, `blockMath`) render for stored documents; the editor itself no longer authors them (no consumer passed `withMath` after the notes workspace was removed).

### Flat files

- Primitives (shadcn-style wrappers over Radix or a third-party lib): alert-dialog, avatar, badge, button, calendar, card, carousel, checkbox, collapsible, command, dialog, drawer, dropdown-menu, form, input, label, popover, scroll-area, select, separator, sheet, skeleton, sonner, switch, tabs, textarea, tooltip.
- Composites: auto-growing-textarea, confirm-delete-dialog, copy-button, date-picker, delete-button, edit-button, empty, icons (`Icons` map: the Lucide glyphs the app uses, an inlined clap, and the brand marks), loading, multi-select, pagination, shell (`ShellBase`).

## Key flows

- Public rich text: `RichText` (`packages/ui/src/rich-text.tsx:22`) → `renderRichTextHtml` (`packages/ui/src/rich-text-render.ts:50`) → `generateHTML(…, renderExtensions)` after citation numbering and numeric-column marking (`rich-text-render.ts:26-29`) → `sanitizeHtml` (`packages/ui/src/lib/sanitize.ts:223`) → `RichTextHtml` (`packages/ui/src/rich-text-html.tsx:50`). `sanitizeHtml` rewrites an `href`/`src` outside `SAFE_SCHEMES` to `#`; it decodes character references once, with any number of leading zeros, and treats a reference it cannot resolve before the first colon as unsafe. It reads a quoted attribute value whole, so a `>` inside an image `alt` stays in the value, and writes `<` and `>` in a kept value as entities; a `<` that opens no complete tag becomes `&lt;`. The full variant reserves `aspect-[auto_16/9]` on the muted surface for every body `<img>` (`rich-text-html.tsx`, the "Images / media" class group). A blog post also passes `imageSizes` to `RichText`: `renderRichTextHtml` writes each image's stored size as an inline `aspect-ratio` after sanitizing (`lib/image-ratios.ts`, `withImageRatios`), so the box is exact before the file draws. An image with no media row keeps the 16:9 box. Mermaid code blocks carry `data-mermaid-size="WxH"`, written by the editor's `MermaidSize` extension (`rich-text-editor/tiptap/extensions/mermaid-size.ts`) once a diagram's text changes while the editor is focused, and kept by `sanitizeHtml` only when it matches `PATTERN_ATTRS`. Blocks saved before that carry no size and still swap in unreserved; they gain one the next time their author edits the diagram.
- Client needing rendered rich text: a server action returns `renderRichTextHtml` output; the client prints it with `RichTextHtml` (e.g. `apps/web/src/entities/project/ui/project-timeline-item.tsx:6`).
- Dashboard editing: `LazyRichTextEditor` (`apps/web/src/shared/ui/lazy-rich-text-editor.tsx:16`, `ssr: false`) → `RichTextEditor` (`packages/ui/src/rich-text-editor/tiptap/rich-text-editor.tsx`; required props `uploadFailedText`, the upload-failure text, and `labels`, an `EditorLabels` (`packages/ui/src/rich-text-editor/tiptap/editor-labels.ts`) holding every other line of text the editor draws). The app builds `labels` once per locale in `apps/web/src/shared/hooks/use-editor-labels.ts`, from `dashboard.media.editor`; Upload, Delete and Cancel reuse `dashboard.media.picker.uploadButton` and `dashboard.shared.confirmDelete`. Forms seed with `toEditorContent` and save `fromEditorContent(json)` (`apps/web/src/widgets/dashboard/project-manager/ui/project-form.tsx`, the editor field).
- Stored value parsing: `parseRichTextContent` accepts any object; legacy plain text passes through and becomes a paragraph (`packages/ui/src/lib/rich-text-content.ts:23,44`).
- Motion: `MotionProvider` (`packages/ui/src/motion/motion-provider.tsx:19`) is mounted at the app root (`apps/web/src/app/providers/global-provider.tsx:24`). It lazy-loads `domAnimation` (`motion-provider.tsx:9-10`) and sets `reducedMotion="user"` (`:22`).
- Scroll reveal: `fadeUp` starts at `motionOpacity.placeholder` (0.2), not 0, so a block below the fold holds its space as a faded placeholder until it reveals (`packages/ui/src/motion/tokens.ts`, `variants.ts`). Every `RevealSection` user gets this, not only the homepage.
- Programmatic scroll: call `scrollIntoViewBehavior()` (`packages/ui/src/lib/prefers-reduced-motion.ts:27`), never a literal `'smooth'`. Used at `packages/ui/src/rich-text-editor/tiptap/outline-aside.tsx` and `packages/ui/src/rich-text-editor/tiptap/extensions/search-and-replace.tsx`.
- Public page frame: `ShellBase` (`packages/ui/src/shell.tsx:7`) owns the top/bottom padding and block gap; a page passes only its max-width (AGENTS §14).
- Styling and build: apps/web scans `packages/ui/src/**` (`apps/web/tailwind.config.ts:8`) and transpiles the package (`apps/web/next.config.js`, `transpilePackages`).

## Recipes

1. **Add a primitive.** Create `packages/ui/src/<name>.tsx` (add `'use client'` only if it has state, effects, handlers or a browser API). Add `export * from './<name>';` to `packages/ui/src/index.ts`. Consumers import `@byte-of-me/ui/<name>` through the `./*` export. Examples: `packages/ui/src/shell.tsx` (server-safe), `packages/ui/src/copy-button.tsx` (client, uses `m.*`).
2. **Add a hook.** Create `packages/ui/src/hooks/use-<name>.ts` and add `export * from './use-<name>';` to `packages/ui/src/hooks/index.ts`. Consumers import `@byte-of-me/ui/hooks/use-<name>` (`./hooks/*` export). Example: `packages/ui/src/hooks/use-lock-body.ts`, imported at `apps/web/src/widgets/public/public-site-header/ui/public-header-mobile-nav.tsx:7`.
3. **Add an editor node.** (a) Define it in `packages/ui/src/rich-text-editor/tiptap/extensions/`. (b) Register it in `createExtensions()` (`create-extensions.ts`). If its node view draws text, give it a `labels` option and add the keys to `editor-labels.ts`, `editor-labels.test-fixture.ts` and `apps/web/src/shared/hooks/use-editor-labels.ts`, then both catalogues. (c) Add a render-side twin with the same name and attributes to `renderExtensions` (`render-extensions.ts`). (d) Optional toolbar: a command button is one `createToolbarButton` spec in `toolbars/basic-toolbars.tsx`; a control with a menu or popover gets its own `toolbars/<name>.tsx`; either way a line in `toolbars/editor-toolbar.tsx`. Example: `Citation` (`extensions/references/citation.ts`) → `CitationBase` (`citation-base.ts`) → `toolbars/citation.tsx`.

## Gotchas

- The root barrel is TipTap-free: the static closure of `packages/ui/src/index.ts` is 61 files with no `@tiptap`, KaTeX or Mermaid import. AGENTS §7 and `apps/web/src/features/public/blog-print/ui/blog-print-trigger.tsx:3-5` say otherwise. Keep `rich-text*` and the editor out of `index.ts` (`index.ts:38-46`).
- `./*` maps top-level `.tsx` only; a `.ts` module needs its own `exports` entry. `lib/tiptap-utils.ts` has none; only editor-internal files import it. `@byte-of-me/ui/hooks` (no file) does not resolve.
- `RichText` has no `'use client'` on purpose. Imported from client code it ships the whole render schema (`rich-text.tsx:1-16`). Hand HTML to `RichTextHtml` instead.
- Editor and render schemas must mirror each other. A node the editor can store but `renderExtensions` lacks makes `generateHTML` throw, and the document prints as escaped plain text (`rich-text-render.ts:20-33,55-57`; invariant at `render-extensions.ts:11-13`).
- `m.*` animates only under `MotionProvider`, which loads the features (`motion-provider.tsx:9-10,21`). `MotionConfig` does not cover raw CSS (AGENTS §14).
- Classes used only in `packages/ui` are generated because of the `apps/web/tailwind.config.ts:8` content glob. Do not narrow that glob.
- Run tests from this directory. `bunfig.toml` resolves its preload against cwd, so `bun test packages/ui` from the root skips `happydom.ts` (AGENTS §10). `@happy-dom/global-registrator` and `@testing-library/react` are declared only in the root `package.json`.
- `packages/ui/README.md` is stale. Its "Known flagged code" paths (`src/rich-text-editor/blocks/**`, `src/rich-text-editor/editor/**`) and `lexical` deps do not exist. No file in `packages/ui/src` imports `next-intl`, so `expandable-text` does not translate. `filter-multi-select-section` does not exist. `apps/web/src/shared/lib` re-exports `cn` but not `sanitizeHtml`. "Every module is reachable by subpath" is wrong (see the second bullet).
- `Button` owns the touch floor at every size: `min-h-11` on touch, and under `can-hover:` `min-h-9` (default, icon), `min-h-8` (sm) or `min-h-10` (lg), plus `min-w-11` / `can-hover:min-w-9` on `icon`. A call site writes its own `min-h-*` only to ask for a different pointer height (the `size="sm"` buttons across the dashboard ask for 36 px). `aria-disabled` dims and blocks the pointer like `disabled`, so a control kept focusable that way needs no class of its own. `Input`, `SelectTrigger` and `TabsTrigger` carry the same floor (36 px, 36 px and 28 px under `can-hover:`). `Input`, `Textarea`, `SelectTrigger` and `Checkbox` draw `aria-invalid="true"` as a `--destructive-text` edge and ring (`FormControl` sets the attribute); the message text beside the field is the non-colour cue. `Checkbox`'s edge is `--input`, filling with `--primary` only when checked.
- `Badge` is a static label: no hover, no focus ring. With `asChild` it styles a `<button>` or `<a>` as interactive (`badgeVariants({ interactive: true })` does the same for a bare element). `TagClickableBadge` and `TechStackClickableBadge` (`apps/web/src/entities/{tag,tech-stack}/ui/`) render a `<button aria-pressed>` when given `onClick` and plain text when not; they were a `div` with `onClick`, which a keyboard could not reach.
- `EditButton` and `DeleteButton` (`edit-button.tsx`, `delete-button.tsx`) are `size="icon"`: 44 px on touch, 36 px with a mouse. `DeleteButton` has three consumers, all dashboard surfaces (`rg -n "DeleteButton" apps packages`); `EditButton` has none yet. Neither takes a size prop.
- `Calendar` is a thin react-day-picker wrapper for the single-date `DatePicker`: 44 px cells on touch (`--cell-size`), 32 px with a pointer, no range, week-number or dropdown-caption styling. `Carousel` is horizontal only; `CarouselPrevious` and `CarouselNext` take their accessible name as `label`, and arrow keys typed into an input, a `<video>` or another handled event are left to it. `useEmblaState(api)` is the one subscription to Embla's selected slide and scroll limits, shared by `Carousel` and the app's `MediaCarousel`. `Pagination` is a `<nav>` named by `pageLabel`, and all three labels are required.
- Hooks: `useDebounce(value, wait)` returns the debounced value. `useClipboard({ timeout })` returns `{ copy, copied }`; `copy` resolves to whether the browser took the text (it refuses outside a secure context or when permission is denied), so a caller can say so. `useIntersection` compares `threshold` by value, so a literal array in the caller does not re-observe on every render.
- `MotionProvider` mounts `LazyMotion` with `strict`: a `motion.*` element throws instead of loading the full feature set, which is how AGENTS §14 (`m.*` only) is enforced. `AutoGrowingTextarea` sizes itself with `useAutoGrow` and scrolls past `max-h-[200px]`.
- The editor is a field: its frame takes `border-input` and a focus ring, and until `useEditor` has built the editor (and, in the app, until the chunk has loaded) it draws `EditorSkeleton` (`packages/ui/src/editor-skeleton.tsx`, subpath `@byte-of-me/ui/editor-skeleton`) at the size it will take. `LazyRichTextEditor` passes `compact` and `minHeight` to that skeleton through a context, because `next/dynamic` gives its loading component no props. Call sites put `FormControl` directly around the editor and add no frame of their own.
- Links: `lib/url.ts` holds `SAFE_SCHEMES` (http, https, mailto, tel), read by the sanitizer, the BibTeX import and the link control; `normalizeLinkInput` turns what an author typed into an address to store (a safe scheme, a path or fragment as typed, a bare domain gets `https://`, anything else is refused). The link and reference fields ignore the Enter that commits an IME composition.
- Search and replace (`extensions/search-and-replace.ts`): the term is literal, the selected match is always in range, and Replace acts on the selected match; matches are drawn by the `search-result` classes in `editor-surface.css`, the selected one with a ring as well as a fill. An image with no uploader to take it is removed with the upload-failed message instead of keeping an address only the author's tab can read.
- `ConfirmDeleteDialog`: `title`, `description`, `actionText` and `cancelText` are required; this package has no next-intl context, so it ships no English default. While `isLoading` it ignores Escape and a scrim tap and disables both buttons. Both buttons use the default Button size.
- `DatePicker` (`placeholder`, `formatDate`, optional `calendarLocale`), `MultiSelect` (`placeholder`, `searchPlaceholder`, `emptyLabel`, `removeLabel`) and `CopyButton` (`label`, `copiedLabel`) take every visible or announced string as a prop. The app calls the `Localized*` wrappers in `apps/web/src/shared/ui/localized-controls.tsx` for the first two (`components.datePicker`, `components.multiSelect`); `MediaCard`, an entity, takes `copyLabel` and `copiedLabel` from `MediaLibrary` (`components.copyButton`). `MultiSelect` keeps its chips beside the combobox button, not inside it, so no button nests in another.

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
- `packages/ui/src/lib/rich-text-content.ts:3-20`, `packages/ui/src/shell.tsx:10-22`: §11.14, comment blocks over three lines (about 169 of 549 blocks, line-count heuristic).
- `apps/web/src/features/public/blog-print/ui/blog-print-trigger.tsx:3-5`: §11.11, stale comment; it says the barrel reaches TipTap, and it does not.

## See also

- [web-shared.md](./web-shared.md): `shared/ui/lazy-rich-text-editor`, `shared/lib/utils`.
- [web-entities-content.md](./web-entities-content.md): rich-text consumers (blog, project, education, featured work).
- [web-widgets.md](./web-widgets.md): public header motion and hook consumers.
- [web-features.md](./web-features.md): blog print and reaction UI.
- [tooling-and-small-packages.md](./tooling-and-small-packages.md): turbo, test and lint wiring.
- [../architecture.md](../architecture.md), [../README.md](../README.md).
