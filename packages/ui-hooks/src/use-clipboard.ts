'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copies text and reports it: `copied` stays true for `timeout` ms after a
 * success, and `copy` resolves to whether the browser took the text (it
 * refuses outside a secure context, or when permission is denied).
 */
export function useClipboard({ timeout = 2000 }: { timeout?: number } = {}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(
    async (value: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        return false;
      }
      if (mounted.current) {
        window.clearTimeout(timer.current);
        setCopied(true);
        timer.current = window.setTimeout(() => setCopied(false), timeout);
      }
      return true;
    },
    [timeout]
  );

  return { copy, copied };
}
