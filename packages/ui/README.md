# @byte-of-me/ui

Shared UI for byte-of-me apps: the TipTap rich-text editor and its renderer,
the form controls and the carousel. The class-name helper, the hooks, the motion
tokens, the Radix primitives and the toaster live in `@byte-of-me/ui-utils`,
`ui-hooks`, `ui-motion`, `ui-primitives` and `ui-toast`; the root barrel
re-exports all of them except `ui-utils`. Consumed as **TypeScript source**
(no build step) through Next.js `transpilePackages`; see
`apps/web/next.config.js`.

The layout, the component list and the rules for each area are in
[docs/codebase/packages-ui.md](../../docs/codebase/packages-ui.md). This file is
only what a consuming app has to do.

## Consuming app checklist

1. `"@byte-of-me/ui": "workspace:*"` in dependencies. The app declares only what
   it imports itself; TipTap and the rest belong to this package, the Radix
   libraries to `ui-primitives`.
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
  `cn`, hooks, motion and the primitives come from the packages above, not from a
  file here.
- App-specific components stay in the app (`apps/web/src/shared/ui/`).
- Every top-level `.tsx` module left here is reachable by subpath
  (`@byte-of-me/ui/form`, `@byte-of-me/ui/command`) as well as through the root
  barrel. A bundle-size gain from migrating the barrel imports was measured and
  rejected (2026-07-27): Turbopack already drops what a page does not reach. A
  primitive is imported from `@byte-of-me/ui-primitives`; the old
  `@byte-of-me/ui/button`-style subpaths are gone.
- Rich text is the exception and is **not** in the barrel. `@byte-of-me/ui/rich-text-editor`
  (the editor, reached through `LazyRichTextEditor`) and the `rich-text*` renderers
  stay subpath-only so TipTap cannot reach a public page.
