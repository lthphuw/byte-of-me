'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * "Is a drag currently over this element?", counted rather than toggled.
 *
 * `dragleave` fires every time the pointer crosses INTO a child element, not
 * only when it leaves the element the handler is on — so a boolean flipped by
 * enter/leave switches off the moment the pointer passes over a paragraph or
 * a button inside the zone, and the overlay strobes as the author moves. The
 * fix is the standard one: keep a depth, and only call it "left" when the
 * enters and the leaves balance out.
 *
 * The depth is a ref because nothing renders from it and it must survive the
 * re-render each `setIsDragging` causes; the boolean is state because the
 * overlay does.
 *
 * `reset()` exists for `drop`: a drop fires NO `dragleave`, so a zone that
 * only decremented would keep the overlay up over the file it just accepted.
 */
export function useDragDepth() {
  const depth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const enter = useCallback(() => {
    depth.current += 1;
    setIsDragging(true);
  }, []);

  const leave = useCallback(() => {
    depth.current -= 1;
    if (depth.current > 0) return;
    depth.current = 0;
    setIsDragging(false);
  }, []);

  const reset = useCallback(() => {
    depth.current = 0;
    setIsDragging(false);
  }, []);

  return { isDragging, enter, leave, reset };
}
