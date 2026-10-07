import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface ContentFadeProps {
  children: ReactNode;
  className?: string;
}

/**
 * Fades a Suspense-resolved block in, so the swap from its skeleton does not pop.
 * Below the fold only — it starts at opacity 0, which would hold back an LCP element.
 * CSS only, so a server component can use it; opacity alone, so it needs no
 * `motion-safe:` (nothing moves, and a fade is what reduced motion keeps).
 */
export function ContentFade({ children, className }: ContentFadeProps) {
  return (
    <div
      className={cn(
        'animate-in fade-in-0 duration-200 ease-enter',
        className
      )}
    >
      {children}
    </div>
  );
}
