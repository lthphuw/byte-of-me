'use client';

import { useCallback, useSyncExternalStore } from 'react';

// `window.matchMedia` does not exist during SSR, so the server (and the
// hydration render, which must match the server HTML) reports `false`.
const getServerSnapshot = () => false;

/**
 * Whether a CSS media query currently matches.
 *
 * Subscribes to the MediaQueryList's own `change` event rather than to
 * `window.resize`. Resize is a coincidence that works for width queries and
 * nothing else: a query like `(pointer: coarse)` or `(prefers-color-scheme:
 * dark)` can flip without the window ever changing size, and would have been
 * stuck on its first value forever. `change` covers the width queries too, and
 * fires once per actual transition instead of on every resize frame.
 *
 * Built on `useSyncExternalStore`, so a component that mounts on the client
 * (not hydrating) reads the real value in its first render instead of
 * rendering `false` and correcting in an effect. A hydrating one still starts
 * `false` and re-renders once with the real value.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query]
  );
  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
