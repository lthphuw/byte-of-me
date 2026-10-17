# @byte-of-me/ui-toast

Layer 1 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

`Toaster` (`src/index.ts`): sonner's toaster wired to the `next-themes` theme and the
site's surface tokens. `sonner`, `next-themes` and `react` are peer dependencies, so
the app, this package and the rich-text editor's `toast()` calls share one `sonner`
instance. A second copy would not show a toast raised from the editor in the app's
`<Toaster>`.
