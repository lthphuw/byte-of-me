# @byte-of-me/ui

Shared UI for byte-of-me apps: shadcn-style primitives over Radix, a few
composites, the TipTap rich-text editor and its renderer, motion variants, and
UI-generic hooks. Consumed as **TypeScript source** (no build step) through
Next.js `transpilePackages`; see `apps/web/next.config.js`.

The layout, the component list and the rules for each area are in
[docs/codebase/packages-ui.md](../../docs/codebase/packages-ui.md). This file is
only what a consuming app has to do.

## Consuming app checklist

1. `"@byte-of-me/ui": "workspace:*"` in dependencies. The app declares only what
   it imports itself; Radix, TipTap and the rest belong to this package.
2. `transpilePackages` needs no entry: `next.config.js` lists every workspace
   package.
3. Cover `'../../packages/*/src/**/*.{ts,tsx}'` in the Tailwind `content` globs.
   The components use the app's theme and CSS variables (`--input`, `--scrim`,
   `--destructive-text` and the rest).
4. Mount `MotionProvider` once near the root: it runs `LazyMotion` in `strict`
   mode, so a component that reaches for `motion.*` throws.

## Conventions

- **No i18n context here.** Every visible or announced string is a prop; the app
  supplies it (see `apps/web/src/shared/ui/localized-controls.tsx` and the
  confirm dialogs). A component that needs a new string takes a new required
  prop, not an English default.
- Internal imports are **relative**; there are no path aliases inside the package.
- App-specific components stay in the app (`apps/web/src/shared/ui/`).
- Every module is reachable by subpath (`@byte-of-me/ui/button`,
  `@byte-of-me/ui/hooks/use-clipboard`, `@byte-of-me/ui/motion`) as well as
  through the root barrel. Prefer a subpath in new code: it says what the file
  depends on. A bundle-size gain from migrating the barrel imports was measured
  and rejected (2026-07-27): Turbopack already drops what a page does not reach.
- Rich text is the exception and is **not** in the barrel. `@byte-of-me/ui/rich-text-editor`
  (the editor, reached through `LazyRichTextEditor`) and the `rich-text*` renderers
  stay subpath-only so TipTap cannot reach a public page.
