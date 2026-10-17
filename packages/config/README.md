# @byte-of-me/config

Shared tooling for the monorepo. It ships no application code.

## TypeScript presets (`typescript/`)

| Preset | Use for | Extends |
| --- | --- | --- |
| `base.json` | Strict defaults every workspace shares | — |
| `library.json` | New packages: ESNext, `bundler` resolution, `react-jsx`, DOM libs, no `incremental`, no Next plugin | `base.json` |
| `node-library.json` | Node packages (`logger`, `storage`) | `base.json` |
| `nextjs.json` | Next.js apps and `packages/ui` | `base.json` |

Workspaces extend the presets with **relative paths** so no install step is
required to resolve them:

```jsonc
// packages/<name>/tsconfig.json
{
  "extends": "../config/typescript/library.json",
  "include": ["src"]
}
```

`packages/db` intentionally deviates from the baseline (`strict: false`,
bundler resolution) because of the generated Prisma client; its
`tsconfig.json` documents the overrides explicitly.

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
| `happydom.ts` | happy-dom on `globalThis`, `IS_REACT_ACT_ENVIRONMENT` | `apps/web`, `packages/ui`, `packages/ui-hooks`, `packages/ui-primitives`, any package made with `new-package --dom` |
| `db-guard.ts` | a local, unreachable `DATABASE_URL` and `DIRECT_URL`; throws on a non-local host | `apps/web`, `packages/db` |

ESLint is configured once at the repository root (`eslint.config.mjs`,
flat config) and applies to every workspace — no per-workspace config
needed.
