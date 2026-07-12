# @byte-of-me/config

Shared tooling configuration for the monorepo.

## TypeScript presets (`typescript/`)

| Preset | Use for | Extends |
| --- | --- | --- |
| `base.json` | Strict defaults every workspace shares | — |
| `node-library.json` | Node packages built with swc + `tsc` declarations (`logger`, `storage`) | `base.json` |
| `nextjs.json` | Next.js apps (`apps/web`) | `base.json` |

Workspaces extend the presets with **relative paths** so no install step is
required to resolve them:

```jsonc
// packages/<name>/tsconfig.json
{
  "extends": "../config/typescript/node-library.json",
  "compilerOptions": {
    // workspace-specific overrides only
  }
}
```

A future `packages/ui` should extend `nextjs.json` (client components,
JSX) or `node-library.json` (headless utilities) and add only its own
overrides.

Note: `packages/db` intentionally deviates from the baseline
(`strict: false`, bundler resolution) because of the generated Prisma
client; its `tsconfig.json` documents the overrides explicitly.

ESLint is configured once at the repository root (`eslint.config.mjs`,
flat config) and applies to every workspace — no per-workspace config
needed.
