import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface ContentFadeProps {
  children: ReactNode;
  className?: string;
}

/**
 * Fades a Suspense-resolved block in, so the swap from its skeleton does not pop. Below
 * the fold only: it starts at opacity 0, which would hold back an LCP element. CSS only
 * (server-usable); opacity alone, so no `motion-safe:` (reduced motion keeps fades).
 */
export function ContentFade({ children, className }: ContentFadeProps) {
  return (
    <div
      className={cn('animate-in fade-in-0 duration-200 ease-enter', className)}
    >
      {children}
    </div>
  );
}
