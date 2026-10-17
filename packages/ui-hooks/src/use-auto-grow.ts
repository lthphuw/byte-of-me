'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * A ref for a `<textarea>` that is as tall as its text. Measured before paint,
 * so a paste or a reset never shows one frame at the old height.
 */
export function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return ref;
}
