/**
 * Virtual modules for three specifiers that only work inside a live Next.js
 * server runtime (a real request, a real React Server Component render, a
 * real incremental cache). `bun test` has none of that, so any spec whose
 * import graph reaches a server action built on these needs a stand-in, not
 * the real thing — none of the following is testing Next.js itself.
 *
 * - `server-only`: Next resolves this bare specifier through its own
 *   bundler alias (`next/dist/compiled/server-only`). It is not an
 *   installed package anywhere in this repo's `node_modules` (confirmed: no
 *   top-level `server-only` in `bun.lock` or any workspace), so outside
 *   Next's bundler it is simply unresolvable — module resolution fails
 *   before a single test runs. The marker package's only production job is
 *   to throw if bundled into a Client Component; that has no meaning in a
 *   Bun test process, which never builds a client bundle, so an empty
 *   module satisfies it.
 *
 * - `next-intl/server`'s `getLocale`/`getTranslations`: both read from
 *   request-scoped storage that only exists during an actual Next.js
 *   render. Calling the real ones outside that context throws
 *   ("`getLocale` is not supported in Client Components"). Server actions
 *   under test don't own locale resolution — they consume whatever locale
 *   they're given — so a fixed 'en' is a stand-in for an upstream concern,
 *   not the thing under test.
 *
 * - `next/cache`: `unstable_cache` wraps a fetch in Next's incremental cache,
 *   which throws ("incrementalCache missing") outside a real Next.js server.
 *   AGENTS.md §10 already excludes cache-key strings from what a test may
 *   assert on, so a passthrough (call the wrapped function directly, no
 *   memoization) is consistent with that: it exercises the computation the
 *   cache wraps without exercising Next's cache machinery.
 *
 *   `revalidateTag` and `revalidatePath` are stubbed as no-ops for the same
 *   reason — they mutate a cache that does not exist here. They are included
 *   because 29 files across the app import from this specifier and the three
 *   named exports are split across them; a stub carrying only
 *   `unstable_cache` would leave a mutating action's test failing with
 *   "revalidateTag is not a function", which reads like a bug in the action
 *   rather than a gap in the harness. If a test ever needs to assert that an
 *   action revalidated the right tag — a real contract, and a common bug per
 *   AGENTS.md §6 — replace these no-ops with recording spies at that point.
 *
 * Loaded via `preload` in this app's `bunfig.toml`, before `./test-setup.ts`,
 * so every spec's import graph sees these already registered.
 */
import { plugin } from 'bun';

plugin({
  name: 'stub-server-only',
  setup(build) {
    build.module('server-only', () => ({ exports: {}, loader: 'object' }));
  },
});

plugin({
  name: 'stub-next-intl-server',
  setup(build) {
    build.module('next-intl/server', () => ({
      exports: {
        getLocale: async () => 'en',
        getTranslations: async () => (key: string) => key,
      },
      loader: 'object',
    }));
  },
});

plugin({
  name: 'stub-next-cache',
  setup(build) {
    build.module('next/cache', () => ({
      exports: {
        unstable_cache:
          <TArgs extends unknown[], TReturn>(
            fn: (...args: TArgs) => Promise<TReturn>
          ) =>
          (...args: TArgs) =>
            fn(...args),
        revalidateTag: () => {},
        revalidatePath: () => {},
      },
      loader: 'object',
    }));
  },
});
