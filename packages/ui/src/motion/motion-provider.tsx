'use client';

import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';

// The heavy animation feature set is loaded on demand (code-split), so the
// initial bundle only ships the tiny `m` component. Components rendered under
// this provider must use `m.*` instead of `motion.*` to benefit.
const loadFeatures = () =>
  import('./motion-features').then((mod) => mod.default);

/**
 * Wraps a subtree so it can use lazy-loaded framer-motion (`m.*`) and, via
 * MotionConfig, automatically honours the user's `prefers-reduced-motion`
 * setting — transform/layout animations are disabled while opacity fades are
 * kept. `strict` is intentionally off so shared components still using
 * `motion.*` keep working inside this provider.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict={false}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
