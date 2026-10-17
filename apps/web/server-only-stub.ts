/**
 * `server-only` is a Next bundler alias, absent from node_modules, so Bun cannot resolve it.
 * Own preload, listed FIRST in bunfig.toml: next-runtime-stubs.ts imports env, which imports it,
 * and Bun resolves static imports before running any code in the same file.
 */
import { plugin } from 'bun';

plugin({
  name: 'stub-server-only',
  setup(build) {
    build.module('server-only', () => ({ exports: {}, loader: 'object' }));
  },
});
