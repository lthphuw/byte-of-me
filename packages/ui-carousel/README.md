# @byte-of-me/ui-carousel

Layer 2 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

A horizontal Embla carousel, all from the root (`src/index.ts`): `Carousel`,
`CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`, the
`CarouselApi` type, and `useEmblaState(api)`, the one subscription to the selected
slide and the scroll limits that `Carousel` and the app's `MediaCarousel` share.
The arrows take their accessible name as `label`.

`react` and `react-dom` are peer dependencies. Specs run from this directory:
`bunfig.toml` preloads happy-dom against the working directory.
