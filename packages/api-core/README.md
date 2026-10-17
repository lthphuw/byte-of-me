# @byte-of-me/api-core

Layer 1 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

The framework-agnostic core of the server-action API: the envelope, input validation,
pagination and the shared constants. Layer 1, not 0, because `parseInput` logs through
`@byte-of-me/logger` (layer 0). No `react`, no `next/*`, no `@/` alias (`noReact` in
`boundaries.json`).

The root (`src/index.ts`) is client-safe: a `'use client'` file may import it, and it
pulls neither `chalk` nor `node:*`.

- `ApiResponse`, `PaginatedData`, `PaginatedMetadata`, `PaginatedParams`: the envelope and
  the page shape. `errorMsg` is the failure field; `errorCode` is set only when the action
  names its reason.
- `unwrapApiResponse`, `ServerActionError`: throw on `{ success: false }` so TanStack sees
  an error; the error carries `errorCode`.
- `clampPagination`, `buildPaginatedMeta`, `MAX_CACHED_PAGE`: bound caller-controlled
  `page` and `limit`; build the page metadata.
- `parsePageParam`, `parseSlugListParam`, `searchHistoryMode`, `FilterHistoryMode`,
  `FilterNavigationOptions`: URL filter parsing for the list pages.
- `cuidSchema`, `slugSchema`, `slugListSchema`, `searchTextSchema` and their limits: zod for
  ids and filters an anonymous caller sends.
- `safeHttpUrl`, `isSafeHttpUrl`, `toSafeHref`: http(s)-only URLs, for a form and for an
  `href` read from the database.
- `getTranslationLanguages`, `getTranslatedContent`: locale, then `en`, then the first row.
- `normalizeEmail`: the one email comparison.
- `CACHE_TAGS`, `INTERACTION`.

`@byte-of-me/api-core/server` is the Node-only subpath:

- `parseInput`, `idSchema`: the runtime check every action runs first. `parseInput` returns
  `ok`, not `success`; `detail` is for logs and admin surfaces, never a visitor.
- `getClientIp`: the rate-limit key from the request headers (`node:net`).

Specs run from this directory with `bun test`; none needs a DOM.
