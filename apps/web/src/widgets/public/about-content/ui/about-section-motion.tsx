'use client';

import type { ReactNode } from 'react';

import { RevealSection } from '@/shared/ui';

/**
 * Thin wrapper kept for backward compatibility — delegates to the shared
 * {@link RevealSection}.
 */
export function AboutSectionMotion({ children }: { children: ReactNode }) {
  return <RevealSection>{children}</RevealSection>;
}
