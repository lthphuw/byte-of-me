'use client';

import { useRef } from 'react';
import { m, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';

/** Thin fixed bar at the top of the viewport that fills as the reader scrolls. */
export function BlogReadingProgress() {
  const { scrollY, scrollYProgress } = useScroll();
  const bar = useRef<HTMLDivElement>(null);

  // A page too short to scroll reports progress 1, not 0; `scrollY` is 0 only
  // there. Clamped because iOS rubber-banding can overshoot the end.
  const progress = useTransform(() =>
    scrollY.get() > 0 ? Math.min(scrollYProgress.get(), 1) : 0
  );

  // `scaleX` is bound to the motion value, so scrolling never renders React.
  // `aria-valuenow` is written straight to the DOM, and only when the rounded
  // percent changes.
  useMotionValueEvent(progress, 'change', (value) => {
    const now = String(Math.round(value * 100));
    if (bar.current && bar.current.getAttribute('aria-valuenow') !== now) {
      bar.current.setAttribute('aria-valuenow', now);
    }
  });

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1">
      <m.div
        ref={bar}
        className="h-full origin-left bg-primary"
        style={{ scaleX: progress }}
        role="progressbar"
        aria-label="Reading progress"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
