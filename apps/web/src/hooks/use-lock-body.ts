// @see https://usehooks.com/useLockBodyScroll.
// hooks/use-lock-body.ts
import { useLayoutEffect } from 'react';

export function useLockBody(enabled?: boolean) {
  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [enabled]);
}
