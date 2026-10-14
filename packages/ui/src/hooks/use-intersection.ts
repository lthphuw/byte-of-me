'use client';

import { useCallback, useRef, useState } from 'react';

/** Back from the comparable key to the value `IntersectionObserver` takes. */
function thresholdFrom(key: string | undefined): number | number[] | undefined {
  if (key === undefined) return undefined;
  return key.includes(',') ? key.split(',').map(Number) : Number(key);
}

/**
 * The latest `IntersectionObserver` entry of the element `ref` is put on.
 * `threshold` may be an array: it is compared by value, so a literal one in the
 * caller does not make `ref` a new callback (and re-observe) on every render.
 */
export function useIntersection<T extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const { root, rootMargin, threshold } = options ?? {};
  const thresholdKey = Array.isArray(threshold)
    ? threshold.join(',')
    : threshold?.toString();

  const ref: React.RefCallback<T | null> = useCallback(
    (element) => {
      observer.current?.disconnect();
      observer.current = null;

      if (element === null) {
        setEntry(null);
        return;
      }

      observer.current = new IntersectionObserver(
        ([latest]) => setEntry(latest),
        {
          root,
          rootMargin,
          threshold: thresholdFrom(thresholdKey),
        }
      );
      observer.current.observe(element);
    },
    [root, rootMargin, thresholdKey]
  );

  return { ref, entry };
}
