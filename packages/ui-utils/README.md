# @byte-of-me/ui-utils

Layer 0 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

Exports (all from the root, `src/index.ts`):

- `cn`: `clsx` then `tailwind-merge`.
- `SAFE_SCHEMES`, `schemeOf`, `normalizeLinkInput`: the link scheme allowlist.
- `scrollIntoViewBehavior`: `'auto'` under `prefers-reduced-motion`, else `'smooth'`.
- `PixelSize`, `isPixelSize`: the check a size passes before it reaches a style.

The package never imports `react` (`noReact` in `boundaries.json`), so
`apps/web/src/shared/lib/utils.ts` can take `cn` from here without the
component library: `/api/og` fails its build when it does.
