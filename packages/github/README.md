# @byte-of-me/github

Layer 1 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

The GitHub pull request code, pure TypeScript with no dependency at all: no `react`, no
`next/*`, no `@/` alias, no environment read (`noReact` in `boundaries.json`). Every fetch
takes its token as an argument, so the caller owns the env, the logging and the cache. The
root (`src/index.ts`) is client-safe; `sideEffects: false` lets a client file that imports
only the ledger helpers drop the fetchers.

- `fetchMergedPullRequests(login, token)`: every merged pull request `login` opened against
  a repo they do not own (GraphQL search, 5 pages of 100 at most). Throws on any transport
  or GraphQL failure so the caller's cache keeps its last good entry.
- `groupByRepo`: folds those pull requests into one `OpenSourceRepo` per repository, most
  merged first, ties by lines changed.
- `toLedger`, `filterLedger`, `pageLedger`, `groupLedgerByMonth`, `LEDGER_PAGE_SIZE`: the
  flat list on `/projects` from the repos: newest first, filtered, paged (5 on a phone, 8
  from `md`) and split by UTC month.
- `resolveLedgerRepo(repos, value)`: the `?repo=` value if it names a repo in the list,
  else `null` (every repo), so a stale link shows the whole list.
- `parseGithubPullRequestUrl`: `https://github.com/{owner}/{repo}/pull/{n}[/...]` to
  `GithubPullRequestRef`, else `null`; a number past GraphQL's `Int` is refused.
- `fetchFeaturedWorkGithub(refs, token)`: repo, stars, title and state per reference in one
  batched query (variables, never string interpolation); `null` where GitHub did not
  resolve one. Throws on transport failure or no `data`.
- Types: `OpenSourceRepo`, `GithubPullRequestRef`, `FeaturedWorkGithub`,
  `FeaturedWorkPullRequestState`.

Specs run from this directory with `bun test`; none needs a DOM.
