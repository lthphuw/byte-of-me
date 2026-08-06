'use client';

import { useEffect, useState } from 'react';

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
 * `matches` is deliberately NOT in the effect's dependencies. It was, and that
 * made every match tear the subscription down and build a new one — the
 * listener has to outlive the value it sets.
 *
 * Starts `false` on the server and on the first client render, then corrects in
 * the effect: `window.matchMedia` does not exist during SSR, and reading it at
 * init would make the first client render disagree with the server HTML.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
