# @byte-of-me/ui-hooks

Layer 0 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

Client hooks, all from the root (`src/index.ts`): `useAutoGrow`, `useClipboard`,
`useDebounce`, `useIntersection`, `useLockBody`, `useMediaQuery`. React is a peer
dependency. Specs run from this directory: `bunfig.toml` preloads happy-dom
against the working directory.
