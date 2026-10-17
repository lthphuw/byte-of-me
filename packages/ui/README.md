# @byte-of-me/ui

Layer 4 in `packages/config/boundaries.json`: it may import only lower layers.

The facade over the TipTap-free UI packages. `src/index.ts` is the only source file: it
`export *`s `@byte-of-me/ui-primitives`, `ui-toast`, `ui-forms`, `ui-carousel`, `ui-hooks`
and `ui-motion`, so the root-barrel imports across `apps/web` read as one import. It has one
export (`.`), no test and no third-party dependency. Consumed as **TypeScript source** (no
build step) through Next.js `transpilePackages`; see `apps/web/next.config.js`.

It never re-exports `@byte-of-me/rich-text-editor`, `rich-text-render`, `rich-text-schema`
or `ui-utils`: the first three carry TipTap, mermaid or KaTeX that must stay off public
pages, and `apps/web/src/shared/lib/utils.ts` takes `cn` from `ui-utils` because pulling
this barrel breaks `/api/og`. A package never imports `@byte-of-me/ui`; `bun run
check-boundaries` fails on it.

The layout, the component list and the rules for each package are in
[docs/codebase/packages-ui.md](../../docs/codebase/packages-ui.md). This file is only what a
consuming app has to do.

## Consuming app checklist

1. `"@byte-of-me/ui": "workspace:*"` in dependencies, plus the package of anything imported
   by name: `@byte-of-me/rich-text-editor`, `rich-text-schema`, `rich-text-render`,
   `ui-utils`. The app declares only what it imports itself.
2. `transpilePackages` needs no entry: `next.config.js` lists every workspace package.
3. Cover `'../../packages/*/src/**/*.{ts,tsx}'` in the Tailwind `content` globs. The
   components use the app's theme and CSS variables (`--input`, `--scrim`,
   `--destructive-text` and the rest).
4. Mount `MotionProvider` once near the root: it runs `LazyMotion` in `strict` mode, so a
   component that reaches for `motion.*` throws.

## Conventions

- **No i18n context in these packages.** Every visible or announced string is a prop; the
  app supplies it (see `apps/web/src/shared/ui/localized-controls.tsx` and the confirm
  dialogs). A component that needs a new string takes a new required prop, not an English
  default.
- Imports inside a package are **relative**; there are no path aliases. `cn`, hooks, motion
  and the primitives come from their packages, not from a file here.
- App-specific components stay in the app (`apps/web/src/shared/ui/`).
- A primitive is imported from `@byte-of-me/ui-primitives`, a form control from
  `@byte-of-me/ui-forms` and the carousel from `@byte-of-me/ui-carousel`. A bundle-size gain
  from migrating barrel imports to those names was measured and rejected (2026-07-27):
  Turbopack already drops what a page does not reach. The exception is a dependency with
  import-time side effects and no `sideEffects` field: vaul injects its stylesheet when
  imported, so the drawer cost every page about 30 KB until it left this barrel.
- The editor (`@byte-of-me/rich-text-editor`, reached through `LazyRichTextEditor`) and the
  `@byte-of-me/rich-text-render` subpaths (`rich-text`, `rich-text-html`,
  `rich-text-render`, `mermaid-blocks`, `math-renderer`, `mermaid-size`) are imported by
  name and are not in the barrel, so TipTap cannot reach a public page.
