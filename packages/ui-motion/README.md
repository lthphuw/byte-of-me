# @byte-of-me/ui-motion

Layer 0 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

Motion tokens, variants and transitions, plus `MotionProvider`, all from the
root (`src/index.ts`). `framer-motion` and `react` are peer dependencies, so the
app and this package share one instance. `MotionProvider` loads the `m.*`
features lazily and runs `LazyMotion` in `strict` mode: a `motion.*` element
throws.
