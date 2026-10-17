# @byte-of-me/config

Shared tooling for the monorepo. It ships no application code.

## TypeScript presets (`typescript/`)

| Preset | Use for | Extends |
| --- | --- | --- |
| `base.json` | Strict defaults every workspace shares | — |
| `library.json` | New packages: ESNext, `bundler` resolution, `react-jsx`, DOM libs, no `incremental`, no Next plugin | `base.json` |
| `node-library.json` | Node packages (`logger`, `storage`) | `base.json` |
| `nextjs.json` | Next.js apps | `base.json` |

Workspaces extend the presets with **relative paths** so no install step is
required to resolve them:

```jsonc
// packages/<name>/tsconfig.json
{
  "extends": "../config/typescript/library.json",
  "include": ["src"]
}
```

`packages/db` extends `base.json` (strict) rather than `library.json`: it holds
no React, so it needs no DOM libs or JSX, and its `tsconfig.json` sets the
module options itself.

## Package layers (`boundaries.json`)

`layers[i]` lists the packages of layer `i`; a package imports only lower
layers. `dbTypesOnly` and `noReact` name the packages that rules 4 and 5 apply
to. `bun run check-boundaries` enforces it and `bun run new-package` edits it.
The rules are in [docs/architecture.md](../../docs/architecture.md) under
"Package layers".

Rule 7 is advice, not a check: a heavy dependency belongs to exactly one
package, and `react`, `framer-motion`, `sonner` and `@tanstack/react-query` are
peers.

## Test preloads (`test/`)

Referenced by relative path from a workspace's `bunfig.toml`:

| File | Registers | Used by |
| --- | --- | --- |
| `happydom.ts` | happy-dom on `globalThis`, `IS_REACT_ACT_ENVIRONMENT` | `apps/web`, `packages/rich-text-editor`, `packages/query`, `packages/ui-hooks`, `packages/ui-primitives`, `packages/ui-forms`, `packages/ui-carousel`, any package made with `new-package --dom` |
| `db-guard.ts` | a local, unreachable `DATABASE_URL` and `DIRECT_URL`; throws on a non-local host | `apps/web`, `packages/db` |

`test/**` is an input of every package's `test` task (root `turbo.json`), so editing a
preload re-runs the suites that load it even though none of them depends on this package.
`turbo.json` here extends the root and adds `scripts/**` to this package's `check-types`
and `lint` for the same reason: they read `../../scripts` by relative path, where this package type-checks (`scripts/tsconfig.json`) and lints the three TypeScript scripts, `check-boundaries.ts`, `gen-icons.ts` and `new-package.ts`.

ESLint is configured once at the repository root (`eslint.config.mjs`,
flat config) and applies to every workspace — no per-workspace config
needed.
