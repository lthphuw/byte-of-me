# @byte-of-me/rich-text-editor

Layer 3 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

The TipTap editor the dashboard writes rich text with, and the vaul drawer its mobile
toolbar uses. One export, the root (`src/index.ts`): `RichTextEditor`,
`RichTextChangeMeta` and the `EditorLabels` type. The app reaches it only through
`LazyRichTextEditor` (`next/dynamic`, `ssr: false`) so TipTap, ProseMirror and vaul
land in one dashboard chunk and never in a public page. Nothing re-exports it:
`@byte-of-me/ui` must not, and `editor-surface.css` is imported by the editor, hence
`sideEffects: ["**/*.css"]`.

It imports the render schema from `@byte-of-me/rich-text-schema` (which it extends with
node views), the preview from `@byte-of-me/rich-text-render`, and the controls from
`ui-primitives`, `ui-forms` (`Command*`), `ui-hooks` and `ui-utils`. `sonner` is a peer:
`toast()` here and the app's `<Toaster>` must be one install.

No i18n context here: every line of text the editor draws is in `EditorLabels`, supplied by
the app (`apps/web/src/shared/hooks/use-editor-labels.ts`).

Specs run from this directory with `bun test`: `bunfig.toml` preloads happy-dom against the
working directory. `schema-parity.spec.ts` checks the render schema draws everything the
editor stores; `form.spec.tsx` checks `FormControl` reaches the editor, `DatePicker` and
`MultiSelect`, which is why `react-hook-form` is a dev dependency.
