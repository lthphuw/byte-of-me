/**
 * `server-only`: Next resolves this bare specifier through its own bundler
 * alias (`next/dist/compiled/server-only`). It is not installed anywhere in
 * this repo's `node_modules`, so outside Next's bundler it is unresolvable and
 * module resolution fails before a single test runs. The marker's only job is
 * to throw when bundled into a Client Component, which has no meaning in a Bun
 * test process, so an empty module satisfies it.
 *
 * Its own preload, listed FIRST in `bunfig.toml`, not a plugin inside
 * `next-runtime-stubs.ts`: that file statically imports `@/shared/config/env`,
 * which imports `server-only`. Bun resolves a module's static imports before
 * running any of its code, so a registration in the same file loses the race.
 */
import { plugin } from 'bun';

plugin({
  name: 'stub-server-only',
  setup(build) {
    build.module('server-only', () => ({ exports: {}, loader: 'object' }));
  },
});
