# @byte-of-me/query

Layer 2 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

The client-state code that needs TanStack Query and nothing from the app: no `next/*`, no
`next-intl`, no `@/` alias. `react`, `react-dom`, `@tanstack/react-query` and `sonner` are
peer dependencies, so the app and this package share one install of each. Every hook file
carries its own `'use client'`, so the root can also be imported from a server component for
`getQueryClient` and the two constants. Everything comes from the root (`src/index.ts`):

- `useServerMutation`: the one client write path. It unwraps the envelope, invalidates the
  `invalidate` keys and runs `onSuccess` only for `success: true`; a failure toasts
  `errorMessages[errorCode]`, else `errorMessage`; a `NEXT_REDIRECT;` rejection is silent.
- `useInfiniteListQuery`, `HYDRATED_LIST_BEHAVIOR`, `InfiniteListQueryBehavior`: a paginated
  list over `ApiResponse<PaginatedData<T>>`. Spread the constant for a list the server
  prefetched, or every mount refetches it.
- `useEditingRecord`: the full record behind an admin list row; mount the form only once
  `record` is set.
- `useUrlSyncedSearch`: a search box whose term lives in the URL. The caller owns the
  navigation through `onCommit`.
- `QueryState`: skeleton while loading, error with Retry, empty, then the content. Every
  string comes from the caller.
- `makeQueryClient`, `getQueryClient`: the shared defaults (60 s `staleTime`, one retry in
  the browser, none on the server) and the per-request server client.
- `ADMIN_PAGE_SIZE`, `ADMIN_OPTIONS_LIMIT`: the manager page size and the picker ceiling.

Query keys are not here: they come from `@byte-of-me/contracts/<slice>`, and a key that
drifts from the server prefetch hydrates nothing and raises no error. Specs run from this
directory: `bunfig.toml` preloads happy-dom against the working directory.
