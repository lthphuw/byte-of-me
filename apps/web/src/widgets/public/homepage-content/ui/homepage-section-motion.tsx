'use client';

import { RevealSection } from '@/shared/ui';

export interface HomepageSectionMotionProps {
  children: React.ReactNode;
  delay?: number;
  viewportOnce?: boolean;
}

/**
 * Thin wrapper kept for backward compatibility — delegates to the shared
 * {@link RevealSection} so every public section shares one animation.
 */
export function HomepageSectionMotion({
  children,
  delay = 0,
  viewportOnce = true,
}: HomepageSectionMotionProps) {
  return (
    <RevealSection delay={delay} once={viewportOnce}>
      {children}
    </RevealSection>
  );
}
