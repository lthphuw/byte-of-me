# @byte-of-me/ui

Shared UI for byte-of-me apps: shadcn/ui primitives, the TipTap rich-text
editor, motion variants, and UI-generic React hooks.

Consumed as **TypeScript source** (no build step) via Next.js
`transpilePackages` — see `apps/web/next.config.js`.

## Consuming app checklist

1. `"@byte-of-me/ui": "workspace:*"` in dependencies.
2. Add `'@byte-of-me/ui'` to `transpilePackages` in next.config.
3. Add `'../../packages/ui/src/**/*.{ts,tsx}'` to the Tailwind `content` globs
   (components use the app's Tailwind theme/CSS variables).
4. `next-intl` peer: a few components (`expandable-text`,
   `filter-multi-select-section`) call `useTranslations` — the app must provide
   the corresponding message keys.

## Conventions

- Internal imports are **relative** — no path aliases inside the package.
- App-specific components stay in the app (`apps/web/src/shared/ui/` holds
  `go-back-button`, which depends on the app's next-intl router).
- `cn` and `sanitizeHtml` live here (`src/lib/`); apps/web re-exports them
  from its `shared/lib` modules for backward compatibility.
- Every module is reachable by subpath (`@byte-of-me/ui/button`,
  `@byte-of-me/ui/hooks/use-clipboard`, `@byte-of-me/ui/motion`) as well as
  through the root barrel. Prefer a subpath in new code — it says what the
  file actually depends on.
  Migrating the ~126 existing barrel imports was **measured and rejected**
  (2026-07-27): with and without the barrel, `/en` initial JS is 1604 KB and
  `.next/static` is 9.0M, because Turbopack already drops what a page does
  not reach. Adding `@byte-of-me/ui` to `optimizePackageImports` changed
  nothing either. The barrel is a readability concern here, not a bundle one,
  and rewriting every call site risks the module-init cycle that breaks
  `/api/og` — a failure only `bun run --filter 'web' build` catches.
- Rich text is the exception and is **not** in the barrel: `rich-text*` and
  the editor stay subpath-only so tiptap cannot reach a public page.

## Known flagged code

- `src/rich-text-editor/blocks/editor-00/**` and
  `src/rich-text-editor/editor/**` (lexical-based editor) are **dead code** —
  nothing imports them. Kept during extraction pending owner sign-off to
  delete (would also free the `lexical` / `@lexical/*` dependencies).
