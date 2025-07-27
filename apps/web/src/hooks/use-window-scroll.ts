// @see https://github.com/mantinedev/mantine
// packages/@mantine/hooks/src/use-window-scroll/use-window-scroll.ts
import { useEffect, useState } from 'react';
import { throttle } from 'lodash';

import { useWindowEvent } from './use-window-event';

export interface UseWindowScrollPosition {
  x: number;
  y: number;
}

export type UseWindowScrollTo = (
  position: Partial<UseWindowScrollPosition>
) => void;
export type UseWindowScrollReturnValue = [
  UseWindowScrollPosition,
  UseWindowScrollTo
];

function getScrollPosition(): UseWindowScrollPosition {
  return typeof window !== 'undefined'
    ? { x: window.scrollX, y: window.scrollY }
    : { x: 0, y: 0 };
}

function scrollTo({ x, y }: Partial<UseWindowScrollPosition>) {
  if (typeof window !== 'undefined') {
    const scrollOptions: ScrollToOptions = { behavior: 'smooth' };

    if (typeof x === 'number') {
      scrollOptions.left = x;
    }

    if (typeof y === 'number') {
      scrollOptions.top = y;
    }

    window.scrollTo(scrollOptions);
  }
}

export function useWindowScroll(
  throttleMs: number = 100
): UseWindowScrollReturnValue {
  const [position, setPosition] = useState<UseWindowScrollPosition>(
    getScrollPosition()
  );

  // Throttled handler for scroll and resize events
  const handleUpdate = throttle(() => {
    setPosition(getScrollPosition());
  }, throttleMs);

  // Attach throttled handlers to scroll and resize events
  useWindowEvent('scroll', handleUpdate);
  useWindowEvent('resize', handleUpdate);

  // Set initial position on mount
  useEffect(() => {
    setPosition(getScrollPosition());
    return () => {
      handleUpdate.cancel(); // Clean up throttle on unmount
    };
  }, []); // Empty dependency array since getScrollPosition doesn't depend on props/state

  return [position, scrollTo] as const;
}
