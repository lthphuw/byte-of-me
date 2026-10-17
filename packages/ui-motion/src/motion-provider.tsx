'use client';

import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';

// The heavy animation feature set is loaded on demand (code-split), so the
// initial bundle only ships the tiny `m` component. Components rendered under
// this provider must use `m.*` instead of `motion.*` to benefit.
const loadFeatures = () =>
  import('./motion-features').then((mod) => mod.default);

/**
 * Lazy-loaded framer-motion (`m.*`) for a subtree, with `prefers-reduced-motion`
 * honoured through MotionConfig: transforms stop, opacity fades stay. `strict`
 * makes a stray `motion.*` fail loudly instead of loading the full feature set.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
