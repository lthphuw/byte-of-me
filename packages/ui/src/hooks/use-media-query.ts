'use client';

import { useCallback, useSyncExternalStore } from 'react';

// `window.matchMedia` does not exist during SSR, so the server (and the
// hydration render, which must match the server HTML) reports `false`.
const getServerSnapshot = () => false;

/**
 * Whether a CSS media query currently matches. Subscribes to the MediaQueryList's `change`, not
 * `window.resize`: `(pointer: coarse)` or `(prefers-color-scheme)` flip without a resize.
 * `useSyncExternalStore` reads the real value on a client mount; a hydrating render starts `false`.
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
