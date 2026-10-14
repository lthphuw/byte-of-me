'use client';

import { useEffect, useState } from 'react';

/** `value`, but only once it has stopped changing for `wait` ms. */
export function useDebounce<T>(value: T, wait: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), wait);
    return () => window.clearTimeout(timer);
  }, [value, wait]);

  return debounced;
}
