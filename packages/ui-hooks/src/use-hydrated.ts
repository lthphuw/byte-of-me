'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * `false` in the server render and the hydrating render, `true` from the next commit, with no
 * effect and no extra paint. Gate what comes from the URL or the browser on it, or the first
 * render stops matching the static HTML (React #418).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
